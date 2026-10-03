import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { staffNav } from '@/features/masterlist/staffNav';

/**
 * Monthly report (online only). A simple outcome breakdown for the staff
 * member's barangay. Aggregates only; names appear in the masterlist, not here.
 */
export default function ReportsScreen() {
  const { t } = useTranslation();

  const { data: counts } = useQuery({
    queryKey: ['reports', 'outcomes'],
    queryFn: async () => {
      const outcomes = ['normal', 'monitor', 'needs_referral'] as const;
      const results = await Promise.all(
        outcomes.map((o) =>
          supabase.from('checkups').select('id', { count: 'exact', head: true }).eq('outcome', o),
        ),
      );
      return outcomes.map((o, i) => ({ outcome: o, count: results[i].count ?? 0 }));
    },
  });

  return (
    <AppShell title={t('reports.title')} nav={staffNav}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2">{t('reports.col.outcome')}</th>
            <th className="py-2">{t('reports.col.count')}</th>
          </tr>
        </thead>
        <tbody>
          {(counts ?? []).map((r) => (
            <tr key={r.outcome} className="border-b border-border/60">
              <td className="py-2">{t(`checkups.outcome.${r.outcome}`)}</td>
              <td className="py-2 font-semibold">{r.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AppShell>
  );
}
