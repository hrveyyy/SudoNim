import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';

/**
 * Citizen self-registration (email + password here; name/sex/birthdate are
 * captured by register_citizen in a later migration). The account is
 * `unverified` until a BHW verifies in person, so after sign-up we show a
 * pending-verification message rather than routing into the app.
 */
export default function RegisterScreen() {
  const { t } = useTranslation();
  const { signUpCitizen } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await signUpCitizen(email.trim(), password);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <main className="carelink-auth">
        <h1>{t('auth.register.title')}</h1>
        <p role="status">{t('auth.register.pending')}</p>
        <p className="carelink-auth__alt">
          <Link to="/login">{t('auth.login.link')}</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="carelink-auth">
      <h1>{t('auth.register.title')}</h1>
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

        <label htmlFor="password">{t('auth.field.password')}</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        {error && (
          <p role="alert" className="carelink-auth__error">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} style={{ minHeight: 44 }}>
          {busy ? t('auth.register.submitting') : t('auth.register.submit')}
        </button>
      </form>

      <p className="carelink-auth__alt">
        {t('auth.register.have_account')} <Link to="/login">{t('auth.login.link')}</Link>
      </p>
    </main>
  );
}
