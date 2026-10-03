import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { staffNav } from '@/features/masterlist/staffNav';
import type { patients_row } from '@/types/rows';

/** Staff creates a referral (status starts at 'sent'). */
export default function ReferralNewScreen() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const patientId = params.get('patient') ?? '';
  const navigate = useNavigate();

  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    enabled: !!patientId,
    queryFn: async (): Promise<patients_row | null> => {
      const { data } = await supabase.from('patients').select('*').eq('id', patientId).maybeSingle();
      return data;
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.from('referrals').insert({
      id: crypto.randomUUID(),
      patient_id: patient.id,
      barangay_id: patient.barangay_id,
      reason: reason.trim() || null,
    } as never);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate('/staff/referrals');
  };

  return (
    <AppShell title={t('referrals.new.title')} nav={staffNav}>
      <form
        onSubmit={onSubmit}
        className="flex max-w-md flex-col gap-3 rounded-cl border border-border bg-surface p-5"
      >
        <label htmlFor="reason" className="text-sm text-text-muted">
          {t('referrals.field.reason')}
        </label>
        <textarea
          id="reason"
          rows={3}
          className="rounded-cl border border-border bg-surface px-3 py-2"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-needs-referral-red">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !patient}
          className="min-h-touch rounded-cl bg-primary px-4 font-semibold text-white disabled:opacity-50"
        >
          {busy ? t('common.saving') : t('referrals.new.submit')}
        </button>
      </form>
    </AppShell>
  );
}
