import { useTranslation } from 'react-i18next';
import { HeartHandshake, Stethoscope, UserRound, type LucideIcon } from 'lucide-react';
import { ChoiceCard } from '@/features/auth/steps/ChoiceCard';
import { StepBackButton } from '@/features/auth/steps/StepBackButton';
import { StepIndicator } from '@/features/auth/steps/StepIndicator';
import type { visitor_status } from '@/features/auth/steps/StatusStep';

/** Selectable role in the public flow. Admin is intentionally excluded. */
export type selectable_role = 'citizen' | 'physician' | 'barangay_staff';

export interface RoleStepProps {
  /** Called with the chosen role; the wizard then resolves the outcome. */
  onSelect: (role: selectable_role) => void;
  /** Returns to the status step; the previously selected status is preserved. */
  onBack: () => void;
  /** The status chosen in the previous step; tunes the subtitle copy. */
  status?: visitor_status | null;
}

/**
 * Role accents follow the steering role badges: patients = green,
 * barangay staff = teal, hospital/doctor = blue. Text always carries the role.
 */
const ROLES: { role: selectable_role; icon: LucideIcon; accent: string }[] = [
  { role: 'citizen', icon: UserRound, accent: 'bg-screened-soft text-screened-ink' },
  { role: 'physician', icon: Stethoscope, accent: 'bg-primary/10 text-primary' },
  { role: 'barangay_staff', icon: HeartHandshake, accent: 'bg-teal-soft text-teal-ink' },
];

/**
 * Role_Step: presents the role choices as action buttons. Returning visitors
 * see citizen, physician, and barangay_staff; new visitors see only citizen
 * and physician, since BHW accounts are seeded by an admin and can't be set
 * up here. The admin role is never offered here —
 * admin sign-in is reachable only via the unlinked /admin/login route. A back
 * control returns the visitor to the status step. All text is i18n-resolved.
 */
export function RoleStep({ onSelect, onBack, status }: RoleStepProps) {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="role-step-title"
      className="motion-safe:duration-300 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
    >
      <StepBackButton label={t('auth.role.back')} onClick={onBack} />
      <StepIndicator current={2} total={2} />

      <h1 id="role-step-title" className="font-heading text-3xl font-bold tracking-tight">
        {t('auth.role.title')}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {status === 'new' ? t('auth.role.subtitle_new') : t('auth.role.subtitle_returning')}
      </p>

      <div role="group" aria-labelledby="role-step-title" className="mt-6 space-y-3">
        {ROLES.filter(({ role }) => !(status === 'new' && role === 'barangay_staff')).map(({ role, icon, accent }) => (
          <ChoiceCard
            key={role}
            id={`role-${role}`}
            value={role}
            icon={icon}
            label={t(`auth.role.${role}`)}
            hint={t(`auth.role.${role}_hint`)}
            accentClassName={accent}
            onClick={() => onSelect(role)}
          />
        ))}
      </div>
    </section>
  );
}
