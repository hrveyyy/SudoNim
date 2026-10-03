import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { citizenNav } from '@/features/citizen/citizenNav';
import { useMyPatient } from '@/features/citizen/useMyPatient';
import { formatManila } from '@/lib/dates';
import type { access_grants_row } from '@/types/rows';

/**
 * "Who looked at my record" — the grants on the citizen's patient record. (RLS
 * lets the owning citizen read access_grants on their own record.)
 */
export default function AccessHistoryScreen() {
  const { t } = useTranslation();
  const { data: patient } = useMyPatient();

  const { data: grants = [], isLoading } = useQuery({
    queryKey: ['access_history', patient?.id],
    enabled: !!patient?.id,
    queryFn: async (): Promise<access_grants_row[]> => {
      const { data } = await supabase
        .from('access_grants')
        .select('*')
        .eq('patient_id', patient!.id)
        .order('granted_at', { ascending: false });
      return data ?? [];
    },
  });

  return (
    <AppShell title={t('citizen.access.title')} nav={citizenNav}>
      {isLoading ? (
        <p>{t('common.loading')}</p>
      ) : grants.length === 0 ? (
        <p className="text-text-muted">{t('citizen.access.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {grants.map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between rounded-cl border border-border bg-surface p-3 text-sm"
            >
              <span>{formatManila(g.granted_at)}</span>
              <span className="rounded-cl bg-bg px-2 py-0.5 text-xs">{g.source}</span>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
