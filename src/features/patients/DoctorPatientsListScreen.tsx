import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { doctorNav } from '@/features/scan/doctorNav';
import { patientName } from '@/lib/format';
import type { patients_row } from '@/types/rows';

/**
 * Patients the doctor currently has access to (live grants). Lists patient_code
 * + name for records the physician can open without re-pairing while the grant
 * lasts.
 */
export default function DoctorPatientsListScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['doctor_patients', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async (): Promise<patients_row[]> => {
      // Grants the doctor holds that are still live.
      const { data: grants } = await supabase
        .from('access_grants')
        .select('patient_id, expires_at, revoked_at')
        .eq('grantee_user_id', session!.user.id)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString());
      const ids = [...new Set((grants ?? []).map((g) => g.patient_id))];
      if (ids.length === 0) return [];
      const { data } = await supabase.from('patients').select('*').in('id', ids);
      return data ?? [];
    },
  });

  return (
    <AppShell title={t('nav.patients')} nav={doctorNav}>
      {isLoading ? (
        <p>{t('common.loading')}</p>
      ) : patients.length === 0 ? (
        <p className="text-text-muted">
          {t('patients.record.no_checkups')} <Link to="/doctor/scan" className="text-primary">{t('nav.scan')}</Link>
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {patients.map((p) => (
            <li key={p.id}>
              <Link
                to={`/doctor/patients/${p.id}`}
                className="flex items-center justify-between rounded-cl border border-border bg-surface p-3"
              >
                <span className="font-medium">{patientName(p.surname, p.first_name)}</span>
                <span className="font-mono text-xs">{p.patient_code}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
