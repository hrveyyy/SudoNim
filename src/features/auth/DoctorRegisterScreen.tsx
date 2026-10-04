import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import { PasswordField } from '@/features/auth/PasswordField';
import type { facilities_row } from '@/types/rows';

/**
 * Doctor application. Creates the account and submits the application
 * (PRC ID, name, hospital) through the doctor-apply Edge Function, which puts
 * it in the admin approval queue. The hospital becomes the doctor's referral
 * inbox once approved. Supporting-document upload is not built yet.
 */
export default function DoctorRegisterScreen() {
  const { t } = useTranslation();
  const { signUpDoctor } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [prcId, setPrcId] = useState('');
  const [fullName, setFullName] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { submitted: boolean }>(null);
  const [busy, setBusy] = useState(false);

  // Hospital list, readable before sign-in (migration 0008).
  const { data: hospitals = [] } = useQuery({
    queryKey: ['facilities', 'hospital', 'public'],
    queryFn: async (): Promise<Pick<facilities_row, 'id' | 'name'>[]> => {
      const { data, error } = await supabase
        .from('facilities')
        .select('id, name')
        .eq('kind', 'hospital')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return;
    setBusy(true);
    setError(null);
    const { error, applicationSubmitted } = await signUpDoctor({
      email: email.trim(),
      password,
      prc_id: prcId.trim(),
      full_name: fullName.trim(),
      facility_id: facilityId,
    });
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setDone({ submitted: applicationSubmitted });
  };

  if (done) {
    return (
      <main className="carelink-auth">
        <h1>{t('auth.doctor.title')}</h1>
        <p role="status">
          {done.submitted ? t('auth.doctor.pending') : t('auth.doctor.apply_retry')}
        </p>
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
        <label htmlFor="full_name">{t('auth.field.full_name')}</label>
        <input
          id="full_name"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

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

        <label htmlFor="facility">{t('auth.field.hospital')}</label>
        <select
          id="facility"
          className="min-h-touch w-full rounded-cl border border-border bg-surface px-3"
          value={facilityId}
          onChange={(e) => setFacilityId(e.target.value)}
          required
        >
          <option value="" disabled>
            {t('common.select')}
          </option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>

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

        <button type="submit" disabled={busy || !facilityId} style={{ minHeight: 44 }}>
          {busy ? t('auth.doctor.submitting') : t('auth.doctor.submit')}
        </button>
      </form>

      <p className="carelink-auth__alt">
        {t('auth.register.have_account')} <Link to="/login/doctor">{t('auth.login.link')}</Link>
      </p>
    </main>
  );
}
