import { db, type outbox_item, type outbox_kind } from '@/lib/db';
import { supabase } from '@/lib/supabase';

/**
 * The single place in the app that flushes the outbox.
 * Staff mutations (check-ups, referrals, household/patient edits) enqueue
 * here and are synced in FIFO order. Doctor actions call RPCs directly and
 * do NOT go through the outbox.
 *
 * Idempotency: every queued row carries a client-generated UUID, so inserts
 * use `ignoreDuplicates` and replaying the queue is safe.
 *
 * Conflict rules (enforced by the server; mirrored in how we enqueue):
 *  - check-ups, lab tests, notes, referrals -> append-only (plain insert).
 *  - household / patient edits -> last-write-wins on `updated_at` (upsert).
 *  - referral STATUS changes -> online-only, server-authoritative, via the
 *    `advance_referral` RPC (kind: 'rpc'); never a direct status write here.
 */

/** Maps an outbox kind to its target table (for table inserts). */
const KIND_TABLE: Record<Exclude<outbox_kind, 'rpc'>, string> = {
  checkup: 'checkups',
  patient: 'patients',
  household: 'households',
  referral: 'referrals',
};

/** Append-only kinds use a plain insert with ignoreDuplicates. */
const APPEND_ONLY: ReadonlySet<outbox_kind> = new Set<outbox_kind>(['checkup', 'referral']);

/** Max attempts before an item is parked as permanently failed. */
const MAX_ATTEMPTS = 8;

type enqueue_args =
  | {
      kind: Exclude<outbox_kind, 'rpc'>;
      payload: Record<string, unknown>;
    }
  | {
      kind: 'rpc';
      rpc_name: string;
      payload: Record<string, unknown>;
    };

/** Queue a local mutation for later sync. Returns the new outbox seq. */
export async function enqueue(args: enqueue_args): Promise<number> {
  const base: Omit<outbox_item, 'seq'> = {
    kind: args.kind,
    status: 'pending',
    table: args.kind === 'rpc' ? null : KIND_TABLE[args.kind],
    rpc_name: args.kind === 'rpc' ? args.rpc_name : null,
    payload: args.payload,
    attempts: 0,
    last_error: null,
    created_at: new Date().toISOString(),
  };
  return db.outbox.add(base as outbox_item);
}

/** Number of changes still waiting to sync (drives the banner). */
export function pending_count(): Promise<number> {
  return db.outbox.where('status').equals('pending').count();
}

/**
 * A permanent error is a client/validation/authorization failure that will
 * never succeed on retry (HTTP 4xx or a Postgres RLS/constraint error).
 * Transient errors (offline, 5xx, network) are retried.
 */
export function is_permanent(error: unknown): boolean {
  const e = error as { status?: number; code?: string } | null;
  if (!e) return false;
  if (typeof e.status === 'number' && e.status >= 400 && e.status < 500) return true;
  // PostgREST / Postgres error codes: 42501 = insufficient_privilege (RLS),
  // 23xxx = integrity constraint violations.
  if (typeof e.code === 'string' && (e.code === '42501' || e.code.startsWith('23'))) {
    return true;
  }
  return false;
}

/** Send one outbox item to the server. Throws on failure. */
async function send(item: outbox_item): Promise<void> {
  if (item.kind === 'rpc') {
    if (!item.rpc_name) throw new Error('rpc item missing rpc_name');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated
    // RPC types are not available on the placeholder Database type yet.
    const { error } = await supabase.rpc(item.rpc_name as any, item.payload as any);
    if (error) throw error;
    return;
  }

  const table = KIND_TABLE[item.kind];
  if (APPEND_ONLY.has(item.kind)) {
    // Append-only: idempotent insert, ignore replays of the same UUID.
    const { error } = await supabase
      .from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- placeholder types
      .insert(item.payload as any, { count: 'exact' })
      .select()
      .maybeSingle();
    // ignoreDuplicates is expressed via upsert with onConflict for Supabase;
    // for a pure append-only insert we treat a duplicate-key error as success.
    if (error && !(error.code && error.code.startsWith('23505'))) throw error;
    return;
  }

  // household / patient edits: last-write-wins upsert on primary key.
  const { error } = await supabase
    .from(table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- placeholder types
    .upsert(item.payload as any, { onConflict: 'id', ignoreDuplicates: false });
  if (error) throw error;
}

/** Exponential backoff ceiling, in ms, for a given attempt count. */
export function backoff_ms(attempts: number): number {
  const base = 1000 * 2 ** Math.min(attempts, 6); // cap growth at 2^6
  return Math.min(base, 60_000);
}

let flushing = false;

/**
 * Flush pending outbox items in FIFO order, then pull server deltas.
 * - Stops at the first transient failure to preserve ordering (retry later).
 * - Parks permanent failures as `failed` and continues.
 */
export async function flush(): Promise<void> {
  if (!navigator.onLine) return;
  if (flushing) return; // guard against overlapping triggers
  flushing = true;
  try {
    const items = await db.outbox.where('status').equals('pending').sortBy('seq');
    for (const it of items) {
      if (it.seq === undefined) continue;
      try {
        await send(it);
        await db.outbox.update(it.seq, { status: 'done' });
      } catch (e) {
        const permanent = is_permanent(e) || it.attempts + 1 >= MAX_ATTEMPTS;
        await db.outbox.update(it.seq, {
          status: permanent ? 'failed' : 'pending',
          attempts: it.attempts + 1,
          last_error: String(e),
        });
        if (!permanent) break; // keep order; retry later with backoff
      }
    }
    // Delta pull is best-effort: the queue drain above is already committed,
    // so a pull failure (e.g. transient network) must not undo that work or
    // crash the flush. It will be retried on the next trigger.
    try {
      await pull_delta();
    } catch {
      // Swallowed intentionally; never log PHI. Retried on next flush.
    }
  } finally {
    flushing = false;
  }
}

/** Tables pulled on delta sync and their Dexie table. */
const DELTA_TABLES = ['households', 'patients', 'checkups', 'referrals'] as const;

/**
 * Fetch rows changed since `last_sync_at` and upsert them locally.
 * Referral STATUS is server-authoritative, so the pulled rows overwrite any
 * local copy for those tables too.
 */
export async function pull_delta(): Promise<void> {
  if (!navigator.onLine) return;
  const meta = await db.meta.get('last_sync_at');
  const since = meta?.value ?? '1970-01-01T00:00:00.000Z';
  const now = new Date().toISOString();

  for (const table of DELTA_TABLES) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .gt('updated_at', since)
      .order('updated_at', { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- placeholder types
    await (db as any)[table].bulkPut(data);
  }

  await db.meta.put({ key: 'last_sync_at', value: now });
}
