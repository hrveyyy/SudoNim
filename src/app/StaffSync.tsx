import { useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { registerSyncTriggers } from '@/features/sync';
import { db, wipe_local_data } from '@/lib/db';

/**
 * Starts offline sync only for a signed-in barangay staff member. Doctors and
 * citizens read from Supabase directly and never cache patient data on the
 * device. If another user's data is still cached here (for example their
 * session expired without a sign-out), it is wiped before this user's sync
 * starts, so one BHW never inherits another's records or sync position.
 */
export function StaffSync() {
  const { profile } = useAuth();
  const staffId = profile?.role === 'barangay_staff' ? profile.id : null;

  useEffect(() => {
    if (!staffId) return;
    let cancelled = false;
    let stop: (() => void) | null = null;

    void (async () => {
      const owner = await db.meta.get('sync_owner');
      if (owner && owner.value !== staffId) await wipe_local_data();
      await db.meta.put({ key: 'sync_owner', value: staffId });
      if (!cancelled) stop = registerSyncTriggers();
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [staffId]);

  return null;
}
