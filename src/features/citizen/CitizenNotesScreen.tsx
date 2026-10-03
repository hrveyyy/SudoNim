import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { citizenNav } from '@/features/citizen/citizenNav';
import { useMyPatient } from '@/features/citizen/useMyPatient';
import { formatDate } from '@/lib/dates';
import type { patient_notes_row } from '@/types/rows';

/**
 * Citizen's visit notes. The citizen may see both their instructions and the
 * clinical note (RLS allows the owning patient). Shown clearly labeled.
 */
export default function CitizenNotesScreen() {
  const { t } = useTranslation();
  const { data: patient } = useMyPatient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['citizen_notes', patient?.id],
    enabled: !!patient?.id,
    queryFn: async (): Promise<patient_notes_row[]> => {
      const { data } = await supabase
        .from('patient_notes')
        .select('*')
        .eq('patient_id', patient!.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  return (
    <AppShell title={t('nav.notes')} nav={citizenNav}>
      {isLoading ? (
        <p>{t('common.loading')}</p>
      ) : notes.length === 0 ? (
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
