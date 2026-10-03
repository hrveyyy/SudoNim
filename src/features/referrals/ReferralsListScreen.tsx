import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { staffNav } from '@/features/masterlist/staffNav';
import type { referrals_row } from '@/types/rows';

/** Staff referrals list, scoped to the barangay by RLS. */
export default function ReferralsListScreen() {
  const { t } = useTranslation();
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['referrals'],
    queryFn: async (): Promise<referrals_row[]> => {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell title={t('referrals.title')} nav={staffNav}>
      {isLoading ? (
        <p>{t('common.loading')}</p>
      ) : referrals.length === 0 ? (
        <p className="text-text-muted">{t('referrals.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {referrals.map((r) => (
            <li key={r.id}>
              <Link
                to={`/staff/referrals/${r.id}`}
                className="flex items-center justify-between rounded-cl border border-border bg-surface p-3"
              >
                <span className="truncate">{r.reason ?? t('referrals.no_reason')}</span>
                <span className="rounded-cl bg-bg px-2 py-0.5 text-xs">
                  {t(`referrals.status.${r.status}`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
