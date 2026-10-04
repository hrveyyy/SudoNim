import { useTranslation } from 'react-i18next';
import { LogIn, UserPlus } from 'lucide-react';
import { ChoiceCard } from '@/features/auth/steps/ChoiceCard';
import { StepBackButton } from '@/features/auth/steps/StepBackButton';
import { StepIndicator } from '@/features/auth/steps/StepIndicator';

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
    <section
      aria-labelledby="status-step-title"
      className="motion-safe:duration-300 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
    >
      <StepBackButton label={t('auth.status.back')} onClick={onBack} />
      <StepIndicator current={1} total={2} />

      <h1 id="status-step-title" className="font-heading text-3xl font-bold tracking-tight">
        {t('auth.status.title')}
      </h1>
      <p className="mt-2 text-muted-foreground">{t('auth.status.subtitle')}</p>

      <div role="group" aria-labelledby="status-step-title" className="mt-6 space-y-3">
        <ChoiceCard
          id="status-new"
          value="new"
          icon={UserPlus}
          label={t('auth.status.new')}
          hint={t('auth.status.new_hint')}
          accentClassName="bg-primary/10 text-primary"
          onClick={() => onSelect('new')}
        />
        <ChoiceCard
          id="status-returning"
          value="returning"
          icon={LogIn}
          label={t('auth.status.returning')}
          hint={t('auth.status.returning_hint')}
          accentClassName="bg-teal-soft text-teal-ink"
          onClick={() => onSelect('returning')}
        />
      </div>
    </section>
  );
}
