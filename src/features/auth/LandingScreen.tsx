import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import { useAuth, roleHome } from '@/features/auth/AuthProvider';

/**
 * Public landing with three role options: Citizen, Barangay Health Worker,
 * Doctor. Admin is intentionally absent (that portal is URL-only).
 */
export default function LandingScreen() {
  const { t } = useTranslation();
  const { loading, session, profile } = useAuth();

  // Already signed in -> straight to role home.
  if (!loading && session && profile) {
    return <Navigate to={roleHome(profile.role)} replace />;
  }

  return (
    <main className="carelink-auth">
      <h1>{t('auth.landing.title')}</h1>
      <p className="carelink-auth__alt">{t('auth.landing.subtitle')}</p>

      <nav className="carelink-landing">
        <Link className="carelink-landing__option" data-role="citizen" to="/login">
          <span className="carelink-landing__label">{t('auth.portal.citizen')}</span>
          <span className="carelink-landing__hint">{t('auth.landing.citizen_hint')}</span>
        </Link>

        <Link className="carelink-landing__option" data-role="barangay_staff" to="/login/staff">
          <span className="carelink-landing__label">{t('auth.portal.staff')}</span>
          <span className="carelink-landing__hint">{t('auth.landing.staff_hint')}</span>
        </Link>

        <Link className="carelink-landing__option" data-role="physician" to="/login/doctor">
          <span className="carelink-landing__label">{t('auth.portal.doctor')}</span>
          <span className="carelink-landing__hint">{t('auth.landing.doctor_hint')}</span>
        </Link>
      </nav>
    </main>
  );
}
