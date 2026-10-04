import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import { PasswordField } from '@/features/auth/PasswordField';
import type { barangays_row } from '@/types/rows';

/**
 * Citizen self-registration. Collects name, sex, and birthdate (the pairing-key
 * basis is surname + birthdate) plus email + password. A DB trigger
 * (0007_citizen_self_register) auto-creates the profile + verified patient row,
 * so the citizen can sign in immediately — after sign-up we redirect to the
 * login page (no in-person BHW verification required).
 */
export default function RegisterScreen() {
  const { t } = useTranslation();
  const { signUpCitizen } = useAuth();
  const navigate = useNavigate();

  const [surname, setSurname] = useState('');
  const [firstName, setFirstName] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('female');
  const [birthdate, setBirthdate] = useState('');
  const [barangayId, setBarangayId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Barangay list, readable before sign-in (migration 0008).
  const { data: barangays = [] } = useQuery({
    queryKey: ['barangays', 'public'],
    queryFn: async (): Promise<Pick<barangays_row, 'id' | 'name'>[]> => {
      const { data, error } = await supabase.from('barangays').select('id, name').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barangayId) return;
    setBusy(true);
    setError(null);
    const { error } = await signUpCitizen({
      email: email.trim(),
      password,
      surname: surname.trim(),
      first_name: firstName.trim(),
      sex,
      birthdate,
      barangay_id: barangayId,
    });
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    // Account is usable immediately — send them to the login page to sign in.
    navigate('/login', { replace: true, state: { registered: true } });
  };

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

        <label htmlFor="barangay" className="text-sm text-text-muted">
          {t('auth.field.barangay')}
        </label>
        <select
          id="barangay"
          className="min-h-touch rounded-cl border border-border bg-surface px-3"
          value={barangayId}
          onChange={(e) => setBarangayId(e.target.value)}
          required
        >
          <option value="" disabled>
            {t('common.select')}
          </option>
          {barangays.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

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
          disabled={busy || !barangayId}
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
