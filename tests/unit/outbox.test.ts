import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

// --- Mock the Supabase client before importing the modules under test. ---
const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import { db } from '@/lib/db';
import { enqueue, flush, is_permanent, backoff_ms, pending_count } from '@/lib/outbox';

/** Builds a chainable query-builder stub for a table insert/upsert/select. */
function tableStub(result: { error: unknown; data?: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.insert = vi.fn(self);
  chain.upsert = vi.fn(() => Promise.resolve(result));
  chain.select = vi.fn(self);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  // delta pull chain: select().gt().order()
  chain.gt = vi.fn(self);
  chain.order = vi.fn(() => Promise.resolve({ data: result.data ?? [], error: result.error }));
  return chain;
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
}

beforeEach(async () => {
  rpcMock.mockReset();
  fromMock.mockReset();
  setOnline(true);
  await db.outbox.clear();
  await db.meta.clear();
  // Default: every table op succeeds, delta pull returns nothing.
  fromMock.mockImplementation(() => tableStub({ error: null, data: [] }));
});

afterEach(async () => {
  await db.outbox.clear();
  await db.meta.clear();
});

describe('is_permanent', () => {
  it('treats 4xx as permanent', () => {
    expect(is_permanent({ status: 403 })).toBe(true);
    expect(is_permanent({ status: 422 })).toBe(true);
  });
  it('treats 5xx and network errors as transient', () => {
    expect(is_permanent({ status: 500 })).toBe(false);
    expect(is_permanent(new Error('network'))).toBe(false);
    expect(is_permanent(null)).toBe(false);
  });
  it('treats RLS (42501) and constraint (23xxx) codes as permanent', () => {
    expect(is_permanent({ code: '42501' })).toBe(true);
    expect(is_permanent({ code: '23503' })).toBe(true);
  });
});

describe('backoff_ms', () => {
  it('grows exponentially and caps at 60s', () => {
    expect(backoff_ms(0)).toBe(1000);
    expect(backoff_ms(1)).toBe(2000);
    expect(backoff_ms(10)).toBe(60_000);
  });
});

describe('enqueue + pending_count', () => {
  it('queues items as pending', async () => {
    await enqueue({ kind: 'checkup', payload: { id: 'c1', patient_id: 'p1' } });
    await enqueue({ kind: 'patient', payload: { id: 'p1' } });
    expect(await pending_count()).toBe(2);
  });
});

describe('flush', () => {
  it('does nothing when offline', async () => {
    setOnline(false);
    await enqueue({ kind: 'checkup', payload: { id: 'c1' } });
    await flush();
    expect(fromMock).not.toHaveBeenCalled();
    expect(await pending_count()).toBe(1);
  });

  it('marks items done on success and pulls delta', async () => {
    await enqueue({ kind: 'checkup', payload: { id: 'c1', patient_id: 'p1' } });
    await flush();
    expect(await pending_count()).toBe(0);
    const done = await db.outbox.where('status').equals('done').count();
    expect(done).toBe(1);
    // last_sync_at advanced by pull_delta
    const meta = await db.meta.get('last_sync_at');
    expect(meta?.value).toBeTruthy();
  });

  it('processes items in FIFO (seq) order', async () => {
    const order: string[] = [];
    fromMock.mockImplementation((table: string) => {
      const stub = tableStub({ error: null, data: [] });
      const origInsert = stub.insert as ReturnType<typeof vi.fn>;
      origInsert.mockImplementation(() => {
        order.push(table);
        return stub;
      });
      return stub;
    });
    await enqueue({ kind: 'checkup', payload: { id: 'c1' } });
    await enqueue({ kind: 'referral', payload: { id: 'r1' } });
    await flush();
    expect(order).toEqual(['checkups', 'referrals']);
  });

  it('parks a permanent failure as failed and continues', async () => {
    let call = 0;
    fromMock.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        // first append-only insert -> RLS error (permanent)
        return tableStub({ error: { code: '42501' }, data: [] });
      }
      return tableStub({ error: null, data: [] });
    });
    await enqueue({ kind: 'checkup', payload: { id: 'c1' } });
    await enqueue({ kind: 'referral', payload: { id: 'r1' } });
    await flush();
    expect(await db.outbox.where('status').equals('failed').count()).toBe(1);
    expect(await db.outbox.where('status').equals('done').count()).toBe(1);
  });

  it('stops at the first transient failure to preserve order', async () => {
    fromMock.mockImplementation(() => tableStub({ error: { status: 500 }, data: [] }));
    await enqueue({ kind: 'checkup', payload: { id: 'c1' } });
    await enqueue({ kind: 'referral', payload: { id: 'r1' } });
    await flush();
    // Both remain pending; first bumped attempts, second untouched.
    // (Note: Dexie's ++seq counter is not reset by clear(), so look items up
    // by sorted order rather than assuming seq 1 and 2.)
    expect(await pending_count()).toBe(2);
    const [first, second] = await db.outbox.orderBy('seq').toArray();
    expect(first?.attempts).toBe(1);
    expect(second?.attempts).toBe(0);
  });

  it('treats a duplicate-key error on append-only insert as success (idempotent)', async () => {
    fromMock.mockImplementation(() =>
      tableStub({ error: { code: '23505' }, data: [] }),
    );
    await enqueue({ kind: 'checkup', payload: { id: 'c1' } });
    await flush();
    expect(await db.outbox.where('status').equals('done').count()).toBe(1);
  });

  it('routes rpc items through supabase.rpc', async () => {
    rpcMock.mockResolvedValue({ error: null });
    await enqueue({ kind: 'rpc', rpc_name: 'advance_referral', payload: { id: 'r1' } });
    await flush();
    expect(rpcMock).toHaveBeenCalledWith('advance_referral', { id: 'r1' });
    expect(await db.outbox.where('status').equals('done').count()).toBe(1);
  });

  it('upserts household/patient edits (last-write-wins)', async () => {
    const stub = tableStub({ error: null, data: [] });
    fromMock.mockImplementation(() => stub);
    await enqueue({ kind: 'patient', payload: { id: 'p1', updated_at: '2026-01-01' } });
    await flush();
    expect(stub.upsert).toHaveBeenCalledWith(
      { id: 'p1', updated_at: '2026-01-01' },
      { onConflict: 'id', ignoreDuplicates: false },
    );
  });
});
