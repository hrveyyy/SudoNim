import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, roleHome, type user_role } from '@/features/auth/AuthProvider';
import { PasswordField } from '@/features/auth/PasswordField';

export interface LoginScreenProps {
  /** The role this portal is for. Only this role is allowed through. */
  expectedRole: user_role;
  /** i18n key suffix for the portal label (e.g. "citizen", "staff"). */
  portalKey: string;
  /** Optional link to a registration route for this role. */
  registerTo?: string;
}

/**
 * Role-specific login portal. One auth mechanism; the entry point declares
 * which role may pass. After a successful password sign-in the profile role is
 * checked against `expectedRole`; a mismatch is rejected with a "wrong portal"
 * message (and the session is dropped in AuthProvider.signInAs).
 */
export function LoginScreen({ expectedRole, portalKey, registerTo }: LoginScreenProps) {
  const { t } = useTranslation();
  const { session, profile, loading, signInAs } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState(false);
  const [busy, setBusy] = useState(false);

  // Shown after a successful self-registration redirect.
  const justRegistered = (location.state as { registered?: boolean } | null)?.registered === true;

  // Already signed in -> go to role home (or where they were headed).
  if (!loading && session && profile) {
    const dest = (location.state as { from?: string } | null)?.from ?? roleHome(profile.role);
    return <Navigate to={dest} replace />;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setPendingNotice(false);
    const { error, wrongPortal, notice } = await signInAs(email.trim(), password, expectedRole);
    setBusy(false);
    if (notice === 'doctor_pending') {
      setPendingNotice(true);
      return;
    }
    if (notice === 'doctor_rejected') {
      setError(t('auth.login.doctor_rejected'));
      return;
    }
    if (wrongPortal) {
      setError(t('auth.login.wrong_portal'));
      return;
    }
    if (error) {
      setError(error);
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <main className="carelink-auth">
      <h1>{t('auth.login.title')}</h1>
      <p className="carelink-auth__portal" data-role={expectedRole}>
        {t(`auth.portal.${portalKey}`)}
      </p>

      {justRegistered && (
        <p role="status" className="carelink-auth__notice">
          {t('auth.register.created_sign_in')}
        </p>
      )}

      {pendingNotice && (
        <p role="status" className="carelink-auth__notice">
          {t('auth.login.doctor_pending')}
        </p>
      )}

      <form onSubmit={onSubmit} className="carelink-auth__form">
        <label htmlFor="email">{t('auth.field.email')}</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <PasswordField
          id="password"
          labelKey="auth.field.password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />

        {error && (
          <p role="alert" className="carelink-auth__error">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} style={{ minHeight: 44 }}>
          {busy ? t('auth.login.submitting') : t('auth.login.submit')}
        </button>
      </form>

      {registerTo && (
        <p className="carelink-auth__alt">
          {t('auth.login.no_account')} <Link to={registerTo}>{t('auth.register.link')}</Link>
        </p>
      )}

      <p className="carelink-auth__alt">
        <Link to="/">{t('auth.landing.back')}</Link>
      </p>
    </main>
  );
}
