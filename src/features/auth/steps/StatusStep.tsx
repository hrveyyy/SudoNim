import { useTranslation } from 'react-i18next';

/** Visitor_Status value: whether the visitor is new or returning. */
export type visitor_status = 'new' | 'returning';

export interface StatusStepProps {
  /** Called with the chosen status; advances the wizard to the role step. */
  onSelect: (status: visitor_status) => void;
  /** Returns to the landing page; any in-progress status is discarded. */
  onBack: () => void;
}

/**
 * Status_Step: the first step of the login wizard. Presents exactly two
 * mutually exclusive choices (new vs returning) as action buttons, so nothing
 * is pre-selected. A back control returns the visitor to the landing page.
 * All text is resolved through i18n.
 */
export function StatusStep({ onSelect, onBack }: StatusStepProps) {
  const { t } = useTranslation();

  return (
    <section className="carelink-auth" aria-labelledby="status-step-title">
      <h1 id="status-step-title">{t('auth.status.title')}</h1>

      <div className="carelink-landing" role="group" aria-labelledby="status-step-title">
        <button
          type="button"
          className="carelink-landing__option"
          data-status="new"
          onClick={() => onSelect('new')}
          style={{ minHeight: 44 }}
        >
          {t('auth.status.new')}
        </button>

        <button
          type="button"
          className="carelink-landing__option"
          data-status="returning"
          onClick={() => onSelect('returning')}
          style={{ minHeight: 44 }}
        >
          {t('auth.status.returning')}
        </button>
      </div>

      <button type="button" onClick={onBack} style={{ minHeight: 44 }}>
        {t('auth.status.back')}
      </button>
    </section>
  );
}
