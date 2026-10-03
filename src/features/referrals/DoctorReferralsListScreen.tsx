import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { doctorNav } from '@/features/scan/doctorNav';
import { Stepper } from '@/components/Stepper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { referrals_row } from '@/types/rows';
import type { Enums } from '@/types/database';

type ReferralStatus = Enums<'referral_status'>;
const FLOW: ReferralStatus[] = ['sent', 'received', 'seen', 'follow_up_set', 'closed'];
const NEXT: Partial<Record<ReferralStatus, ReferralStatus>> = {
  sent: 'received',
  received: 'seen',
  seen: 'follow_up_set',
  follow_up_set: 'closed',
};

/**
 * Doctor referrals inbox. Physicians can advance referral status via
 * advance_referral (server-authoritative). Reads are RLS-scoped.
 */
export default function DoctorReferralsListScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['doctor_referrals'],
    queryFn: async (): Promise<referrals_row[]> => {
      const { data } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const advance = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: ReferralStatus }) => {
      const { error } = await supabase.rpc('advance_referral', { p_referral_id: id, p_next: next });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctor_referrals'] }),
  });

  return (
    <AppShell title={t('referrals.title')} nav={doctorNav}>
      {isLoading ? (
        <p>{t('common.loading')}</p>
      ) : referrals.length === 0 ? (
        <p className="text-text-muted">{t('referrals.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {referrals.map((r) => {
            const status = r.status as ReferralStatus;
            const next = NEXT[status];
            const doneIdx = FLOW.indexOf(status);
            return (
              <li key={r.id} className="rounded-cl border border-border bg-surface p-3">
                <p className="mb-2">{r.reason ?? t('referrals.no_reason')}</p>
                <Stepper
                  steps={FLOW.map((s) => ({ key: s, label: t(`referrals.status.${s}`) }))}
                  current={status}
                  done={FLOW.slice(0, Math.max(0, doneIdx))}
                />
                {next && status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => advance.mutate({ id: r.id, next })}
                    disabled={advance.isPending}
                    className="mt-2 min-h-touch rounded-cl bg-primary px-4 font-semibold text-white disabled:opacity-50"
                  >
                    {t('referrals.advance_to', { status: t(`referrals.status.${next}`) })}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
