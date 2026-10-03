import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import { useAuth, roleHome } from '@/features/auth/AuthProvider';

/**
 * Public landing. A product intro and a single primary call to action that
 * leads to the staged login wizard at `/login`. No role options and no other
 * sign-in or registration links live here — role selection is internalized by
 * the login flow.
 */
export default function LandingScreen() {
  const { t } = useTranslation();
  const { loading, session, profile } = useAuth();

  // Authenticated-redirect guard. Only leave the landing when the session is
  // settled AND a profile with a defined role has resolved. While still loading
  // (Req 1.7), or when a session has no resolved profile/role (Req 1.8), stay
  // on the landing and render it. Redirect to the role home only on a resolved
  // role (Req 1.4).
  if (!loading && session && profile) {
    return <Navigate to={roleHome(profile.role)} replace />;
  }

  return (
    <main className="carelink-auth">
      <h1>{t('auth.landing.title')}</h1>
      <p className="carelink-auth__alt">{t('auth.landing.intro')}</p>

      <Link className="carelink-landing__cta" to="/login" style={{ minHeight: 44 }}>
        {t('auth.landing.cta')}
      </Link>
    </main>
  );
}
