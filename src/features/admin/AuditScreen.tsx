import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { adminNav } from '@/features/admin/adminNav';
import { formatManila } from '@/lib/dates';
import type { audit_logs_row } from '@/types/rows';

/**
 * Pseudonymized audit viewer. Shows action + actor USER ID + time only — never
 * names (admin reads audit logs pseudonymized).
 */
export default function AuditScreen() {
  const { t } = useTranslation();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit_logs'],
    queryFn: async (): Promise<audit_logs_row[]> => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  return (
    <AppShell title={t('admin.audit.title')} nav={adminNav}>
      {isLoading ? (
        <p>{t('common.loading')}</p>
      ) : logs.length === 0 ? (
        <p className="text-text-muted">{t('admin.audit.empty')}</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-2">{t('admin.audit.action')}</th>
              <th className="py-2 pr-2">{t('admin.audit.actor')}</th>
              <th className="py-2">{t('admin.audit.when')}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-border/60">
                <td className="py-2 pr-2">{l.action}</td>
                <td className="py-2 pr-2 font-mono text-xs">{l.actor_user_id ?? '—'}</td>
                <td className="py-2">{formatManila(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
