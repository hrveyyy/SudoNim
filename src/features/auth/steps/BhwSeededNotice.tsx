import { useTranslation } from 'react-i18next';

export interface BhwSeededNoticeProps {
  /** Returns to the role step. */
  onBack: () => void;
}

/**
 * BhwSeededNotice: shown when a new visitor selects the barangay_staff role.
 * Barangay health worker accounts are created by an administrator and cannot be
 * self-registered, so this presents the seeded-only message plus a back control
 * (44px touch target) that returns to the role step. All text is i18n-resolved.
 */
export function BhwSeededNotice({ onBack }: BhwSeededNoticeProps) {
  const { t } = useTranslation();

  return (
    <section className="carelink-auth" aria-labelledby="bhw-seeded-title">
      <h1 id="bhw-seeded-title">{t('auth.bhw.seeded_title')}</h1>
      <p className="carelink-auth__alt">{t('auth.bhw.seeded_body')}</p>

      <button type="button" onClick={onBack} style={{ minHeight: 44 }}>
        {t('auth.bhw.back')}
      </button>
    </section>
  );
}
