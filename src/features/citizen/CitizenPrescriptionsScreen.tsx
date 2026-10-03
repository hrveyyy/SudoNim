import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { citizenNav } from '@/features/citizen/citizenNav';
import { useMyPatient } from '@/features/citizen/useMyPatient';
import { formatManila } from '@/lib/dates';
import type { prescriptions_row } from '@/types/rows';

/** Citizen's own prescriptions (RLS: patients.user_id = auth.uid()). */
export default function CitizenPrescriptionsScreen() {
  const { t } = useTranslation();
  const { data: patient } = useMyPatient();

  const { data: rxs = [], isLoading } = useQuery({
    queryKey: ['citizen_prescriptions', patient?.id],
    enabled: !!patient?.id,
    queryFn: async (): Promise<prescriptions_row[]> => {
      const { data } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', patient!.id)
        .order('issued_at', { ascending: false });
      return data ?? [];
    },
  });

  return (
    <AppShell title={t('prescriptions.list_title')} nav={citizenNav}>
      {isLoading ? (
        <p>{t('common.loading')}</p>
      ) : rxs.length === 0 ? (
        <p className="text-text-muted">{t('prescriptions.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rxs.map((rx) => (
            <li key={rx.id}>
              <Link
                to={`/me/prescriptions/${rx.id}`}
                className="flex items-center justify-between rounded-cl border border-border bg-surface p-3"
              >
                <span>{formatManila(rx.issued_at)}</span>
                <span className="text-primary">{t('prescriptions.view')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
