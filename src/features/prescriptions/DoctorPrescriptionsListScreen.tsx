import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { doctorNav } from '@/features/scan/doctorNav';
import { formatManila } from '@/lib/dates';
import type { prescriptions_row } from '@/types/rows';

/** Prescriptions issued by this physician. */
export default function DoctorPrescriptionsListScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();

  const { data: rxs = [], isLoading } = useQuery({
    queryKey: ['doctor_prescriptions', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async (): Promise<prescriptions_row[]> => {
      const { data } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('physician_id', session!.user.id)
        .order('issued_at', { ascending: false });
      return data ?? [];
    },
  });

  return (
    <AppShell title={t('prescriptions.list_title')} nav={doctorNav}>
      {isLoading ? (
        <p>{t('common.loading')}</p>
      ) : rxs.length === 0 ? (
        <p className="text-text-muted">{t('prescriptions.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rxs.map((rx) => (
            <li key={rx.id}>
              <Link
                to={`/doctor/prescriptions/${rx.id}`}
                className="flex items-center justify-between rounded-cl border border-border bg-surface p-3"
              >
                <span>{formatManila(rx.issued_at)}</span>
                <span className="rounded-cl bg-bg px-2 py-0.5 text-xs">
                  {rx.status === 'cancelled'
                    ? t('referrals.status.cancelled')
                    : t('prescriptions.view')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
