import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { adminNav } from '@/features/admin/adminNav';
import type { doctor_applications_row } from '@/types/rows';

/** Admin reviews pending doctor applications (approve_doctor RPC). */
export default function DoctorApprovalsScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['doctor_applications'],
    queryFn: async (): Promise<doctor_applications_row[]> => {
      const { data } = await supabase
        .from('doctor_applications')
        .select('*')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase.rpc('approve_doctor', {
        p_application_id: id,
        p_approve: approve,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctor_applications'] }),
  });

  return (
    <AppShell title={t('admin.approvals.title')} nav={adminNav}>
      {isLoading ? (
        <p>{t('common.loading')}</p>
      ) : apps.length === 0 ? (
        <p className="text-text-muted">{t('admin.approvals.empty')}</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-2">{t('admin.approvals.prc')}</th>
              <th className="py-2 pr-2">{t('admin.approvals.status')}</th>
              <th className="py-2">{t('masterlist.col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id} className="border-b border-border/60">
                <td className="py-2 pr-2 font-mono">{a.prc_id}</td>
                <td className="py-2 pr-2">{a.status}</td>
                <td className="py-2">
                  {a.status === 'pending' && (
                    <span className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => review.mutate({ id: a.id, approve: true })}
                        disabled={review.isPending}
                        className="rounded-cl bg-screened-green px-3 py-1 text-xs font-semibold text-white"
                      >
                        {t('admin.approvals.approve')}
                      </button>
                      <button
                        type="button"
                        onClick={() => review.mutate({ id: a.id, approve: false })}
                        disabled={review.isPending}
                        className="rounded-cl border border-needs-referral-red px-3 py-1 text-xs text-needs-referral-red"
                      >
                        {t('admin.approvals.reject')}
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
