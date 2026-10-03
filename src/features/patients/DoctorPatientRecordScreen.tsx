import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { doctorNav } from '@/features/scan/doctorNav';
import { RiskChip } from '@/components/RiskChip';
import { VitalsBox } from '@/components/VitalsBox';
import { patientName } from '@/lib/format';
import { formatDate } from '@/lib/dates';
import type { patients_row, checkups_row, patient_notes_row } from '@/types/rows';

/**
 * Doctor patient record. open_patient_record audits the view and requires an
 * active grant (minted by the pairing-key challenge). RLS also gates the reads.
 */
export default function DoctorPatientRecordScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  // Audit the open + confirm grant. If this fails, the reads below will also
  // be blocked by RLS.
  const { data: opened, isError } = useQuery({
    queryKey: ['open_record', id],
    enabled: !!id,
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc('open_patient_record', { p_patient_id: id! });
      if (error) throw error;
      return data as string;
    },
  });

  const { data: patient } = useQuery({
    queryKey: ['doctor_patient', id],
    enabled: !!opened,
    queryFn: async (): Promise<patients_row | null> => {
      const { data } = await supabase.from('patients').select('*').eq('id', id!).maybeSingle();
      return data;
    },
  });

  const { data: checkups = [] } = useQuery({
    queryKey: ['doctor_checkups', id],
    enabled: !!opened,
    queryFn: async (): Promise<checkups_row[]> => {
      const { data } = await supabase
        .from('checkups')
        .select('*')
        .eq('patient_id', id!)
        .order('checkup_date', { ascending: false });
      return data ?? [];
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['doctor_notes', id],
    enabled: !!opened,
    queryFn: async (): Promise<patient_notes_row[]> => {
      const { data } = await supabase
        .from('patient_notes')
        .select('*')
        .eq('patient_id', id!)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  if (isError) {
    return (
      <AppShell title={t('patients.record.title')} nav={doctorNav}>
        <p className="text-needs-referral-red">{t('scan.pairing.failed')}</p>
        <Link to="/doctor/scan" className="text-primary">
          {t('nav.scan')}
        </Link>
      </AppShell>
    );
  }

  if (!patient) {
    return (
      <AppShell title={t('patients.record.title')} nav={doctorNav}>
        <p>{t('common.loading')}</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={patientName(patient.surname, patient.first_name)} nav={doctorNav}>
      <section className="mb-4 rounded-cl border border-border bg-surface p-4">
        <p className="font-mono text-sm">{patient.patient_code}</p>
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          to={`/doctor/patients/${patient.id}/prescriptions/new`}
          className="min-h-touch rounded-cl bg-primary px-4 py-2 font-semibold text-white"
        >
          {t('prescriptions.new.title')}
        </Link>
        <Link
          to={`/doctor/patients/${patient.id}/notes/new`}
          className="min-h-touch rounded-cl border border-border px-4 py-2"
        >
          {t('notes.new.title')}
        </Link>
      </div>

      <h2 className="mb-2 font-heading text-lg font-semibold">{t('patients.record.timeline')}</h2>
      {checkups.length === 0 ? (
        <p className="text-text-muted">{t('patients.record.no_checkups')}</p>
      ) : (
        <ul className="mb-4 flex flex-col gap-3">
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

      <h2 className="mb-2 font-heading text-lg font-semibold">{t('nav.notes')}</h2>
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
              {n.clinical_note && (
                <p className="mt-1 text-text-muted">
                  <span className="font-semibold">{t('notes.clinical_note')}: </span>
                  {n.clinical_note}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
