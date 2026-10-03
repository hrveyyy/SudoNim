import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { adminNav } from '@/features/admin/adminNav';

/**
 * Admin aggregate reports — counts only, never names (admin is aggregate-only).
 */
export default function AdminReportsScreen() {
  const { t } = useTranslation();

  const { data } = useQuery({
    queryKey: ['admin_reports'],
    queryFn: async () => {
      const [patients, referrals, prescriptions] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }),
        supabase.from('referrals').select('id', { count: 'exact', head: true }),
        supabase.from('prescriptions').select('id', { count: 'exact', head: true }),
      ]);
      return {
        patients: patients.count ?? 0,
        referrals: referrals.count ?? 0,
        prescriptions: prescriptions.count ?? 0,
      };
    },
  });

  const rows: { labelKey: string; value: number }[] = [
    { labelKey: 'dashboard.kpi.patients', value: data?.patients ?? 0 },
    { labelKey: 'referrals.title', value: data?.referrals ?? 0 },
    { labelKey: 'prescriptions.list_title', value: data?.prescriptions ?? 0 },
  ];

  return (
    <AppShell title={t('admin.reports.title')} nav={adminNav}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
