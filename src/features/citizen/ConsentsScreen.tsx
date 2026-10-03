import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { citizenNav } from '@/features/citizen/citizenNav';
import { useMyPatient } from '@/features/citizen/useMyPatient';
import { formatManila } from '@/lib/dates';
import type { consents_row } from '@/types/rows';

/**
 * Citizen consents. The owning citizen may read, grant, and revoke consents on
 * their record (RLS). Revoking sets status + revoked_at.
 */
export default function ConsentsScreen() {
  const { t } = useTranslation();
  const { data: patient } = useMyPatient();
  const qc = useQueryClient();

  const { data: consents = [], isLoading } = useQuery({
    queryKey: ['consents', patient?.id],
    enabled: !!patient?.id,
    queryFn: async (): Promise<consents_row[]> => {
      const { data } = await supabase
        .from('consents')
        .select('*')
        .eq('patient_id', patient!.id)
        .order('granted_at', { ascending: false });
      return data ?? [];
    },
  });

  const revoke = useMutation({
    mutationFn: async (consentId: string) => {
      const { error } = await supabase
        .from('consents')
        .update({ status: 'revoked', revoked_at: new Date().toISOString() })
        .eq('id', consentId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consents'] }),
  });

  return (
    <AppShell title={t('citizen.consents.title')} nav={citizenNav}>
      {isLoading ? (
        <p>{t('common.loading')}</p>
      ) : consents.length === 0 ? (
        <p className="text-text-muted">{t('citizen.consents.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {consents.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-cl border border-border bg-surface p-3 text-sm"
            >
              <span>{formatManila(c.granted_at)}</span>
              <span className="flex items-center gap-2">
                <span className="rounded-cl bg-bg px-2 py-0.5 text-xs">{c.status}</span>
                {c.status === 'granted' && (
                  <button
                    type="button"
                    onClick={() => revoke.mutate(c.id)}
                    disabled={revoke.isPending}
                    className="rounded-cl border border-needs-referral-red px-2 py-1 text-xs text-needs-referral-red"
                  >
                    {t('citizen.consents.revoke')}
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
