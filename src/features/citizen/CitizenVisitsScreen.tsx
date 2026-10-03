import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { citizenNav } from '@/features/citizen/citizenNav';
import { useMyPatient } from '@/features/citizen/useMyPatient';
import { RiskChip } from '@/components/RiskChip';
import { VitalsBox } from '@/components/VitalsBox';
import { formatDate } from '@/lib/dates';
import type { checkups_row } from '@/types/rows';

/** Citizen's own check-up history. */
export default function CitizenVisitsScreen() {
  const { t } = useTranslation();
  const { data: patient } = useMyPatient();

  const { data: checkups = [], isLoading } = useQuery({
    queryKey: ['citizen_visits', patient?.id],
    enabled: !!patient?.id,
    queryFn: async (): Promise<checkups_row[]> => {
      const { data } = await supabase
        .from('checkups')
        .select('*')
        .eq('patient_id', patient!.id)
        .order('checkup_date', { ascending: false });
      return data ?? [];
    },
  });

  return (
    <AppShell title={t('citizen.visits.title')} nav={citizenNav}>
      {isLoading ? (
        <p>{t('common.loading')}</p>
      ) : checkups.length === 0 ? (
        <p className="text-text-muted">{t('citizen.visits.empty')}</p>
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
    </AppShell>
  );
}
