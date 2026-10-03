import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';

export interface PairingKeyModalProps {
  patientCode: string;
  onSuccess: (patientId: string) => void;
  onCancel: () => void;
}

/**
 * Pairing-key challenge modal. After a QR scan resolves to a patient_code, the
 * doctor asks the patient for their surname + birthdate and types them here.
 * verify_pairing_key checks them server-side (constant-time hash), rate-limits,
 * and mints a 12-hour grant on success. The birthdate is NEVER logged.
 */
export function PairingKeyModal({ patientCode, onSuccess, onCancel }: PairingKeyModalProps) {
  const { t } = useTranslation();
  const [surname, setSurname] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc('verify_pairing_key', {
      p_patient_code: patientCode,
      p_surname: surname.trim(),
      p_birthdate: birthdate,
    });
    setBusy(false);
    if (error) {
      // Lockout vs mismatch both surface as a generic failure message.
      setError(
        error.message.includes('locked') ? t('scan.pairing.locked') : t('scan.pairing.failed'),
      );
      return;
    }
    onSuccess(data as string);
  };

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('scan.pairing.title')}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-cl bg-surface p-5 shadow-lg"
      >
        <h2 className="mb-1 font-heading text-lg font-bold">{t('scan.pairing.title')}</h2>
        <p className="mb-3 text-sm text-text-muted">{t('scan.pairing.intro')}</p>

        <label htmlFor="pk-surname" className="text-sm text-text-muted">
          {t('scan.pairing.surname')}
        </label>
        <input
          id="pk-surname"
          className="mb-3 min-h-touch w-full rounded-cl border border-border bg-surface px-3"
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          required
          autoFocus
        />

        <label htmlFor="pk-birthdate" className="text-sm text-text-muted">
          {t('scan.pairing.birthdate')}
        </label>
        <input
          id="pk-birthdate"
          type="date"
          className="mb-3 min-h-touch w-full rounded-cl border border-border bg-surface px-3"
          value={birthdate}
          onChange={(e) => setBirthdate(e.target.value)}
          required
        />

        {error && (
          <p role="alert" className="mb-3 text-sm text-needs-referral-red">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="min-h-touch flex-1 rounded-cl bg-primary px-4 font-semibold text-white disabled:opacity-50"
          >
            {busy ? t('common.loading') : t('scan.pairing.submit')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-touch rounded-cl border border-border px-4"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
