import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { staffNav } from '@/features/masterlist/staffNav';
import { Stepper } from '@/components/Stepper';
import type { referrals_row } from '@/types/rows';
import type { Enums } from '@/types/database';

type ReferralStatus = Enums<'referral_status'>;

// The forward flow (cancel is a separate action).
const FLOW: ReferralStatus[] = ['sent', 'received', 'seen', 'follow_up_set', 'closed'];

const NEXT: Partial<Record<ReferralStatus, ReferralStatus>> = {
  sent: 'received',
  received: 'seen',
  seen: 'follow_up_set',
  follow_up_set: 'closed',
};

/** Staff referral detail with status stepper and advance/cancel actions. */
export default function ReferralDetailScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: referral } = useQuery({
    queryKey: ['referral', id],
    enabled: !!id,
    queryFn: async (): Promise<referrals_row | null> => {
      const { data, error } = await supabase.from('referrals').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const advance = useMutation({
    mutationFn: async (next: ReferralStatus) => {
      const { error } = await supabase.rpc('advance_referral', {
        p_referral_id: id!,
        p_next: next,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['referral', id] }),
  });

  if (!referral) {
    return (
      <AppShell title={t('referrals.detail.title')} nav={staffNav}>
        <p>{t('common.loading')}</p>
      </AppShell>
    );
  }

  const status = referral.status as ReferralStatus;
  const doneIdx = FLOW.indexOf(status);
  const done = FLOW.slice(0, Math.max(0, doneIdx));
  const next = NEXT[status];
  const cancellable = ['sent', 'received', 'seen', 'follow_up_set'].includes(status);

  return (
    <AppShell title={t('referrals.detail.title')} nav={staffNav}>
      <section className="mb-4 rounded-cl border border-border bg-surface p-4">
        <p className="mb-3">{referral.reason ?? t('referrals.no_reason')}</p>
        <Stepper
          steps={FLOW.map((s) => ({ key: s, label: t(`referrals.status.${s}`) }))}
          current={status}
          done={done}
        />
      </section>

      {status === 'cancelled' ? (
        <p className="text-needs-referral-red font-semibold">{t('referrals.status.cancelled')}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {next && (
            <button
              type="button"
              onClick={() => advance.mutate(next)}
              disabled={advance.isPending}
              className="min-h-touch rounded-cl bg-primary px-4 font-semibold text-white disabled:opacity-50"
            >
              {t('referrals.advance_to', { status: t(`referrals.status.${next}`) })}
            </button>
          )}
          {cancellable && (
            <button
              type="button"
              onClick={() => advance.mutate('cancelled')}
              disabled={advance.isPending}
              className="min-h-touch rounded-cl border border-needs-referral-red px-4 text-needs-referral-red"
            >
              {t('referrals.cancel')}
            </button>
          )}
        </div>
      )}
    </AppShell>
  );
}
