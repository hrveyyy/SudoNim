import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import { AppShell } from '@/components/layout/AppShell';
import { staffNav } from '@/features/masterlist/staffNav';
import type { facilities_row, patients_row } from '@/types/rows';

/**
 * Staff creates a referral (status starts at 'sent'). The receiving hospital
 * is required: doctors see the referrals sent to their own hospital.
 */
export default function ReferralNewScreen() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const patientId = params.get('patient') ?? '';
  const navigate = useNavigate();
  const { session } = useAuth();

  const [reason, setReason] = useState('');
  const [facilityId, setFacilityId] = useState('');
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

  const { data: hospitals = [] } = useQuery({
    queryKey: ['facilities', 'hospital'],
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

  // Preselect the only hospital when there is just one.
  useEffect(() => {
    if (!facilityId && hospitals.length === 1) setFacilityId(hospitals[0].id);
  }, [hospitals, facilityId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !facilityId) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.from('referrals').insert({
      id: crypto.randomUUID(),
      patient_id: patient.id,
      barangay_id: patient.barangay_id,
      facility_id: facilityId,
      created_by: session?.user?.id ?? null,
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
        <label htmlFor="facility" className="text-sm text-text-muted">
          {t('referrals.field.facility')}
        </label>
        <select
          id="facility"
          className="min-h-touch rounded-cl border border-border bg-surface px-3"
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
          disabled={busy || !patient || !facilityId}
          className="min-h-touch rounded-cl bg-primary px-4 font-semibold text-white disabled:opacity-50"
        >
          {busy ? t('common.saving') : t('referrals.new.submit')}
        </button>
      </form>
    </AppShell>
  );
}
