import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { staffNav } from '@/features/masterlist/staffNav';
import { RiskChip } from '@/components/RiskChip';
import { VitalsBox } from '@/components/VitalsBox';
import { patientName } from '@/lib/format';
import { formatDate } from '@/lib/dates';
import { callRpc } from '@/lib/rpc';
import type { patients_row, checkups_row } from '@/types/rows';

/** A visit note as BHWs see it: instructions + follow-up, never the clinical note. */
interface StaffNote {
  id: string;
  created_at: string;
  patient_instructions: string | null;
  has_follow_up: boolean;
  follow_up_date: string | null;
}

/**
 * Staff patient record: identity, verify action, the append-only check-up
 * timeline with risk chips, and doctors' visit notes (patient instructions and
 * follow-up only). Links to new check-up and referral creation.
 */
export default function PatientRecordScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: patient } = useQuery({
    queryKey: ['patient', id],
    enabled: !!id,
    queryFn: async (): Promise<patients_row | null> => {
      const { data, error } = await supabase.from('patients').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: checkups = [] } = useQuery({
    queryKey: ['checkups', id],
    enabled: !!id,
    queryFn: async (): Promise<checkups_row[]> => {
      const { data, error } = await supabase
        .from('checkups')
        .select('*')
        .eq('patient_id', id!)
        .order('checkup_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Doctors' notes, through the staff-safe function (migration 0009).
  const { data: notes = [] } = useQuery({
    queryKey: ['staff_notes', id],
    enabled: !!id,
    queryFn: async (): Promise<StaffNote[]> => {
      const { data, error } = await callRpc<StaffNote[]>('staff_patient_notes', {
        p_patient_id: id!,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const verify = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('verify_citizen', { p_patient_id: id! });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient', id] }),
  });

  if (!patient) {
    return (
      <AppShell title={t('patients.record.title')} nav={staffNav}>
        <p>{t('common.loading')}</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={patientName(patient.surname, patient.first_name)} nav={staffNav}>
      <section className="mb-4 rounded-cl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-sm">{patient.patient_code ?? t('masterlist.code_pending')}</p>
            <p className="text-sm text-text-muted">
              {patient.verification_status === 'verified'
                ? t('masterlist.filter.verified')
                : t('masterlist.filter.unverified')}
            </p>
          </div>
          {patient.verification_status !== 'verified' && (
            <button
              type="button"
              onClick={() => verify.mutate()}
              disabled={verify.isPending}
              className="min-h-touch rounded-cl bg-teal px-4 font-semibold text-white disabled:opacity-50"
            >
              {t('patients.record.verify')}
            </button>
          )}
        </div>
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          to={`/staff/checkups/new?patient=${patient.id}`}
          className="min-h-touch rounded-cl bg-primary px-4 py-2 font-semibold text-white"
        >
          {t('patients.record.new_checkup')}
        </Link>
        <Link
          to={`/staff/referrals/new?patient=${patient.id}`}
          className="min-h-touch rounded-cl border border-border px-4 py-2"
        >
          {t('patients.record.new_referral')}
        </Link>
      </div>

      <h2 className="mb-2 font-heading text-lg font-semibold">{t('patients.record.timeline')}</h2>
      {checkups.length === 0 ? (
        <p className="text-text-muted">{t('patients.record.no_checkups')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {checkups.map((c) => (
            <li key={c.id} className="rounded-cl border border-border bg-surface p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-text-muted">{formatDate(c.checkup_date)}</span>
                <RiskChip outcome={c.outcome} />
              </div>
              <VitalsBox
                systolic={c.systolic}
                diastolic={c.diastolic}
                fasting_glucose={c.fasting_glucose}
              />
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-2 mt-6 font-heading text-lg font-semibold">{t('nav.notes')}</h2>
      {notes.length === 0 ? (
        <p className="text-text-muted">{t('notes.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-cl border border-border bg-surface p-3">
              <p className="text-sm text-text-muted">{formatDate(n.created_at)}</p>
              {n.patient_instructions && (
                <p className="mt-1">
                  <span className="font-semibold">{t('notes.patient_instructions')}: </span>
                  {n.patient_instructions}
                </p>
              )}
              {n.has_follow_up && (
                <p className="mt-1 text-sm">
                  {n.follow_up_date
                    ? t('notes.follow_up_on', { date: formatDate(n.follow_up_date) })
                    : t('notes.follow_up_needed')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
