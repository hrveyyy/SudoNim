import { useTranslation } from 'react-i18next';

/** Selectable role in the public flow. Admin is intentionally excluded. */
export type selectable_role = 'citizen' | 'physician' | 'barangay_staff';

export interface RoleStepProps {
  /** Called with the chosen role; the wizard then resolves the outcome. */
  onSelect: (role: selectable_role) => void;
  /** Returns to the status step; the previously selected status is preserved. */
  onBack: () => void;
}

/**
 * Role_Step: presents exactly three role choices (citizen, physician,
 * barangay_staff) as action buttons. The admin role is never offered here —
 * admin sign-in is reachable only via the unlinked /admin/login route. A back
 * control returns the visitor to the status step. All text is i18n-resolved.
 */
export function RoleStep({ onSelect, onBack }: RoleStepProps) {
  const { t } = useTranslation();

  return (
    <section className="carelink-auth" aria-labelledby="role-step-title">
      <h1 id="role-step-title">{t('auth.role.title')}</h1>

      <div className="carelink-landing" role="group" aria-labelledby="role-step-title">
        <button
          type="button"
          className="carelink-landing__option"
          data-role="citizen"
          onClick={() => onSelect('citizen')}
          style={{ minHeight: 44 }}
        >
          {t('auth.role.citizen')}
        </button>

        <button
          type="button"
          className="carelink-landing__option"
          data-role="physician"
          onClick={() => onSelect('physician')}
          style={{ minHeight: 44 }}
        >
          {t('auth.role.physician')}
        </button>

        <button
          type="button"
          className="carelink-landing__option"
          data-role="barangay_staff"
          onClick={() => onSelect('barangay_staff')}
          style={{ minHeight: 44 }}
        >
          {t('auth.role.barangay_staff')}
        </button>
      </div>

      <button type="button" onClick={onBack} style={{ minHeight: 44 }}>
        {t('auth.role.back')}
      </button>
    </section>
  );
}
