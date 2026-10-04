import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { callRpc } from '@/lib/rpc';
import { AppShell } from '@/components/layout/AppShell';
import { adminNav } from '@/features/admin/adminNav';

interface AggregateCounts {
  patients: number;
  checkups: number;
  referrals: number;
  prescriptions: number;
}

/**
 * Admin aggregate reports: counts only, never names. Admin has no table read
 * policies on patient data, so the counts come from the admin-only
 * admin_aggregate_counts function (migration 0008).
 */
export default function AdminReportsScreen() {
  const { t } = useTranslation();

  const { data, isError } = useQuery({
    queryKey: ['admin_reports'],
    queryFn: async (): Promise<AggregateCounts> => {
      const { data, error } = await callRpc<AggregateCounts>('admin_aggregate_counts');
      if (error || !data) throw error ?? new Error('no data');
      return data;
    },
  });

  const rows: { labelKey: string; value: number }[] = [
    { labelKey: 'dashboard.kpi.patients', value: data?.patients ?? 0 },
    { labelKey: 'admin.reports.checkups', value: data?.checkups ?? 0 },
    { labelKey: 'referrals.title', value: data?.referrals ?? 0 },
    { labelKey: 'prescriptions.list_title', value: data?.prescriptions ?? 0 },
  ];

  return (
    <AppShell title={t('admin.reports.title')} nav={adminNav}>
      {isError && (
        <p role="alert" className="mb-3 text-sm text-needs-referral-red">
          {t('admin.reports.load_failed')}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {rows.map((r) => (
          <div key={r.labelKey} className="rounded-cl border border-border bg-surface p-4">
            <p className="text-xs text-text-muted">{t(r.labelKey)}</p>
            <p className="text-2xl font-bold">{r.value}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
