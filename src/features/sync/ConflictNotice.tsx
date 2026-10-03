import { useTranslation } from 'react-i18next';

export type conflict_kind = 'last_write_wins' | 'referral_status_server';

export interface ConflictNoticeProps {
  kind: conflict_kind;
  onDismiss?: () => void;
}

/**
 * Inline notice shown when the server copy supersedes a local change.
 *  - last_write_wins: household/patient edit overwritten by a newer server row.
 *  - referral_status_server: a referral status change was rejected offline
 *    because status transitions are server-authoritative and online-only.
 */
export function ConflictNotice({ kind, onDismiss }: ConflictNoticeProps) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="carelink-conflict-notice" data-kind={kind}>
      <p className="carelink-conflict-notice__title">{t('sync.conflict.title')}</p>
      <p className="carelink-conflict-notice__body">{t(`sync.conflict.${kind}`)}</p>
      {onDismiss && (
        <button
          type="button"
          className="carelink-conflict-notice__dismiss"
          onClick={onDismiss}
        >
          {t('sync.conflict.dismiss')}
        </button>
      )}
    </div>
  );
}
