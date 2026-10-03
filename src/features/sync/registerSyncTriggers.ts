import { flush } from '@/lib/outbox';

/**
 * Wires the flush triggers described in the blueprint:
 *   - app start
 *   - the `online` event
 *   - Background Sync (where supported) via the `sync-outbox` tag
 *   - manual "Sync now" is handled in the UI (useOutbox.sync_now)
 *
 * Returns a cleanup function that removes the listeners.
 */
export function registerSyncTriggers(): () => void {
  // App start: attempt an immediate flush (no-op if offline).
  void flush();

  const onOnline = () => {
    void flush();
  };
  window.addEventListener('online', onOnline);

  // Background Sync: ask the service worker to register a sync so the queue
  // drains even if the app is closed when connectivity returns. The SW is
  // responsible for calling back into the app / running its own flush; here
  // we only register the tag when the API is available.
  void registerBackgroundSync();

  return () => {
    window.removeEventListener('online', onOnline);
  };
}

async function registerBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> };
    };
    if (reg.sync) {
      await reg.sync.register('sync-outbox');
    }
  } catch {
    // Background Sync is best-effort; the online event + app-start flush cover
    // browsers without it. Never log PHI; nothing sensitive is logged here.
  }
}
