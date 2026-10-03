import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { staffNav } from '@/features/masterlist/staffNav';

/**
 * Staff creates a patient record for an unregistered resident via the
 * register_citizen RPC. The server assigns patient_code. Barangay scope comes
 * from the staff member's profile (RPC reads current_barangay_id()).
 */
export default function PatientNewScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [surname, setSurname] = useState('');
  const [firstName, setFirstName] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('female');
  const [birthdate, setBirthdate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc('register_citizen', {
      p_surname: surname.trim(),
      p_first_name: firstName.trim(),
      p_sex: sex,
      p_birthdate: birthdate,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate(`/staff/patients/${data}`);
  };

  return (
    <AppShell title={t('patients.new.title')} nav={staffNav}>
      <form
        onSubmit={onSubmit}
        className="flex max-w-md flex-col gap-3 rounded-cl border border-border bg-surface p-5"
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
          {busy ? t('common.saving') : t('patients.new.submit')}
        </button>
      </form>
    </AppShell>
  );
}
