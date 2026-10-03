import { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { flush } from '@/lib/outbox';

export interface outbox_state {
  /** Changes still waiting to sync. */
  pending: number;
  /** Changes parked as permanently failed (need attention). */
  failed: number;
  /** A flush is currently running. */
  syncing: boolean;
  /** Trigger a manual "Sync now". */
  sync_now: () => Promise<void>;
}

/**
 * Exposes outbox counts and a manual sync trigger for the sync banner.
 * Counts come from a live query so the banner updates as items drain.
 */
export function useOutbox(): outbox_state {
  const [syncing, setSyncing] = useState(false);

  const pending =
    useLiveQuery(() => db.outbox.where('status').equals('pending').count(), [], 0) ?? 0;
  const failed =
    useLiveQuery(() => db.outbox.where('status').equals('failed').count(), [], 0) ?? 0;

  const sync_now = useCallback(async () => {
    setSyncing(true);
    try {
      await flush();
    } finally {
      setSyncing(false);
    }
  }, []);

  return { pending, failed, syncing, sync_now };
}
