import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { PasswordField } from '@/features/auth/PasswordField';

/**
 * Citizen self-registration. Collects name, sex, and birthdate (the pairing-key
 * basis is surname + birthdate) plus email + password. The account is
 * `unverified` until a BHW verifies in person, so after sign-up we show a
 * pending-verification message rather than routing into the app.
 */
export default function RegisterScreen() {
  const { t } = useTranslation();
  const { signUpCitizen } = useAuth();

  const [surname, setSurname] = useState('');
  const [firstName, setFirstName] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('female');
  const [birthdate, setBirthdate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await signUpCitizen({
      email: email.trim(),
      password,
      surname: surname.trim(),
      first_name: firstName.trim(),
      sex,
      birthdate,
    });
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
        <h1 className="mb-3 text-center font-heading text-2xl font-bold">
          {t('auth.register.title')}
        </h1>
        <p role="status" className="rounded-cl border border-border bg-surface p-4 text-center">
          {t('auth.register.pending')}
        </p>
        <p className="mt-4 text-center text-text-muted">
          <Link to="/login" className="text-primary">
            {t('auth.login.link')}
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="mb-4 text-center font-heading text-2xl font-bold">
        {t('auth.register.title')}
      </h1>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 rounded-cl border border-border bg-surface p-5"
      >
        <label htmlFor="surname" className="text-sm text-text-muted">
          {t('auth.field.surname')}
        </label>
        <input
          id="surname"
          className="min-h-touch rounded-cl border border-border bg-surface px-3"
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          required
          autoComplete="family-name"
        />

        <label htmlFor="first_name" className="text-sm text-text-muted">
          {t('auth.field.first_name')}
        </label>
        <input
          id="first_name"
          className="min-h-touch rounded-cl border border-border bg-surface px-3"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          autoComplete="given-name"
        />

        <label htmlFor="sex" className="text-sm text-text-muted">
          {t('auth.field.sex')}
        </label>
        <select
          id="sex"
          className="min-h-touch rounded-cl border border-border bg-surface px-3"
          value={sex}
          onChange={(e) => setSex(e.target.value as 'male' | 'female')}
        >
          <option value="female">{t('auth.sex.female')}</option>
          <option value="male">{t('auth.sex.male')}</option>
        </select>

        <label htmlFor="birthdate" className="text-sm text-text-muted">
          {t('auth.field.birthdate')}
        </label>
        <input
          id="birthdate"
          type="date"
          className="min-h-touch rounded-cl border border-border bg-surface px-3"
          value={birthdate}
          onChange={(e) => setBirthdate(e.target.value)}
          required
        />

        <label htmlFor="email" className="text-sm text-text-muted">
          {t('auth.field.email')}
        </label>
        <input
          id="email"
          type="email"
          className="min-h-touch rounded-cl border border-border bg-surface px-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <PasswordField
          id="password"
          labelKey="auth.field.password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          minLength={8}
        />

        <p className="text-xs text-text-muted">{t('auth.register.pairing_note')}</p>

        {error && (
          <p role="alert" className="text-sm text-needs-referral-red">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 min-h-touch rounded-cl bg-primary px-4 font-semibold text-white disabled:opacity-50"
        >
          {busy ? t('auth.register.submitting') : t('auth.register.submit')}
        </button>
      </form>

      <p className="mt-4 text-center text-text-muted">
        {t('auth.register.have_account')}{' '}
        <Link to="/login" className="text-primary">
          {t('auth.login.link')}
        </Link>
      </p>
    </main>
  );
}
