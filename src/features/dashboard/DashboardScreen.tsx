import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { staffNav } from '@/features/masterlist/staffNav';

interface Kpis {
  patients: number;
  verified: number;
  needsReferral: number;
  openReferrals: number;
}

/** Staff dashboard: coverage KPIs + a simple outcome chart (online only). */
export default function DashboardScreen() {
  const { t } = useTranslation();

  const { data: kpis } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: async (): Promise<Kpis> => {
      const [patients, verified, needsRef, openRef] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }),
        supabase
          .from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('verification_status', 'verified'),
        supabase
          .from('checkups')
          .select('id', { count: 'exact', head: true })
          .eq('outcome', 'needs_referral'),
        supabase
          .from('referrals')
          .select('id', { count: 'exact', head: true })
          .in('status', ['sent', 'received', 'seen', 'follow_up_set']),
      ]);
      return {
        patients: patients.count ?? 0,
        verified: verified.count ?? 0,
        needsReferral: needsRef.count ?? 0,
        openReferrals: openRef.count ?? 0,
      };
    },
  });

  const cards: { labelKey: string; value: number }[] = [
    { labelKey: 'dashboard.kpi.patients', value: kpis?.patients ?? 0 },
    { labelKey: 'dashboard.kpi.verified', value: kpis?.verified ?? 0 },
    { labelKey: 'dashboard.kpi.needs_referral', value: kpis?.needsReferral ?? 0 },
    { labelKey: 'dashboard.kpi.open_referrals', value: kpis?.openReferrals ?? 0 },
  ];

  const chartData = cards.map((c) => ({ name: t(c.labelKey), value: c.value }));

  return (
    <AppShell title={t('dashboard.title')} nav={staffNav}>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.labelKey} className="rounded-cl border border-border bg-surface p-4">
            <p className="text-xs text-text-muted">{t(c.labelKey)}</p>
            <p className="text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="h-64 rounded-cl border border-border bg-surface p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={11} />
            <YAxis allowDecimals={false} fontSize={11} />
            <Tooltip />
            <Bar dataKey="value" fill="var(--cl-primary)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AppShell>
  );
}
