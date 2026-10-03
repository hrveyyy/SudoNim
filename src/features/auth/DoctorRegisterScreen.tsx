import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { PasswordField } from '@/features/auth/PasswordField';

/**
 * Doctor application. Captures email + password + PRC ID now; the full intake
 * (supporting-document upload to a private bucket, pending admin approval) is
 * the doctor-apply Edge Function in a later task. After submit we show a
 * "pending approval" message rather than routing into the app.
 */
export default function DoctorRegisterScreen() {
  const { t } = useTranslation();
  const { signUpDoctor } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [prcId, setPrcId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await signUpDoctor(email.trim(), password, prcId.trim());
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
        <h1>{t('auth.doctor.title')}</h1>
        <p role="status">{t('auth.doctor.pending')}</p>
        <p className="carelink-auth__alt">
          <Link to="/login/doctor">{t('auth.login.link')}</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="carelink-auth">
      <h1>{t('auth.doctor.title')}</h1>
      <p className="carelink-auth__alt">{t('auth.doctor.subtitle')}</p>

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

        <label htmlFor="prc">{t('auth.doctor.prc_id')}</label>
        <input
          id="prc"
          type="text"
          value={prcId}
          onChange={(e) => setPrcId(e.target.value)}
          required
        />

        <PasswordField
          id="password"
          labelKey="auth.field.password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          minLength={8}
        />

        {error && (
          <p role="alert" className="carelink-auth__error">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} style={{ minHeight: 44 }}>
          {busy ? t('auth.doctor.submitting') : t('auth.doctor.submit')}
        </button>
      </form>

      <p className="carelink-auth__alt">
        {t('auth.register.have_account')} <Link to="/login/doctor">{t('auth.login.link')}</Link>
      </p>
    </main>
  );
}
