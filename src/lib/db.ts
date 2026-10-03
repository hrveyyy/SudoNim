import Dexie, { type Table } from 'dexie';
import type {
  households_row,
  patients_row,
  checkups_row,
  referrals_row,
  risk_rules_row,
} from '@/types/rows';

/**
 * The single place in the app that defines the Dexie (IndexedDB) schema.
 * No other module may call `new Dexie(...)` or `db.version(...)`.
 *
 * Privacy: IndexedDB is the ONLY place PHI is cached offline. API responses
 * must never be placed in Cache Storage (that is handled by the service
 * worker, which precaches the app shell and static assets only).
 */

/** Kinds of mutations the outbox can carry. */
export type outbox_kind = 'checkup' | 'patient' | 'household' | 'referral' | 'rpc';

/** Lifecycle of an outbox item. */
export type outbox_status = 'pending' | 'done' | 'failed';

/**
 * A queued local mutation awaiting sync.
 * `payload` carries client-generated UUIDs so the server insert is idempotent
 * (insert with ignoreDuplicates). For `kind: 'rpc'`, `rpc_name` + `payload`
 * describe the call.
 */
export interface outbox_item {
  /** Auto-incremented primary key; also preserves FIFO order for flush. */
  seq?: number;
  kind: outbox_kind;
  status: outbox_status;
  /** Target table for table inserts (null for rpc kind). */
  table?: string | null;
  /** RPC name for `kind: 'rpc'`. */
  rpc_name?: string | null;
  /** The row to insert or the RPC arguments. snake_case end to end. */
  payload: Record<string, unknown>;
  attempts: number;
  last_error?: string | null;
  created_at: string;
}

/** Local sync metadata (single-row-per-key store). */
export interface meta_row {
  key: 'last_sync_at' | 'device_id';
  value: string;
}

export class CareLinkDexie extends Dexie {
  households!: Table<households_row, string>;
  patients!: Table<patients_row, string>;
  checkups!: Table<checkups_row, string>;
  referrals!: Table<referrals_row, string>;
  riskRules!: Table<risk_rules_row, number>;
  outbox!: Table<outbox_item, number>;
  meta!: Table<meta_row, string>;

  constructor() {
    super('carelink');
    // Schema version 1 — matches blueprint section 8.
    // Only indexed fields are listed; full row objects are still stored.
    this.version(1).stores({
      households: 'id, barangay_id, purok_id, updated_at',
      patients: 'id, household_id, patient_code, updated_at',
      checkups: 'id, patient_id, checkup_date',
      referrals: 'id, patient_id, status',
      riskRules: 'version',
      outbox: '++seq, kind, status, created_at',
      meta: 'key',
    });
  }
}

export const db = new CareLinkDexie();

/** Wipe all locally cached data (used on sign-out). */
export async function wipe_local_data(): Promise<void> {
  await db.transaction(
    'rw',
    [db.households, db.patients, db.checkups, db.referrals, db.riskRules, db.outbox, db.meta],
    async () => {
      await Promise.all([
        db.households.clear(),
        db.patients.clear(),
        db.checkups.clear(),
        db.referrals.clear(),
        db.riskRules.clear(),
        db.outbox.clear(),
        db.meta.clear(),
      ]);
    },
  );
}
