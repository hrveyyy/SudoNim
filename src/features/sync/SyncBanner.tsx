import { useTranslation } from 'react-i18next';
import { useOnline } from '@/hooks/useOnline';
import { useOutbox } from '@/hooks/useOutbox';

/**
 * Status banner for barangay staff.
 * Shows "Offline, N changes waiting" / "N changes waiting to sync" /
 * "All synced", a "Sync now" action, and a failed-items warning.
 *
 * Risk/status is never conveyed by color alone (product guardrail): the state
 * is carried by the text label; color only reinforces it.
 */
export function SyncBanner() {
  const { t } = useTranslation();
  const online = useOnline();
  const { pending, failed, syncing, sync_now } = useOutbox();

  const statusText = (() => {
    if (syncing) return t('sync.status.syncing');
    if (pending === 0) return t('sync.status.all_synced');
    if (!online) {
      return t('sync.status.offline_waiting', { count: pending });
    }
    return t('sync.status.online_waiting', { count: pending });
  })();

  const tone = (() => {
    if (failed > 0) return 'danger';
    if (!online) return 'offline';
    if (pending > 0) return 'pending';
    return 'ok';
  })();

  return (
    <div
      role="status"
      aria-live="polite"
      data-tone={tone}
      className="carelink-sync-banner"
    >
      <span className="carelink-sync-banner__status">{statusText}</span>

      {failed > 0 && (
        <span className="carelink-sync-banner__failed">
          {t('sync.failed', { count: failed })} {t('sync.failed.hint')}
        </span>
      )}

      <button
        type="button"
        className="carelink-sync-banner__action"
        onClick={() => void sync_now()}
        disabled={syncing || !online || (pending === 0 && failed === 0)}
      >
        {t('sync.action.sync_now')}
      </button>
    </div>
  );
}
