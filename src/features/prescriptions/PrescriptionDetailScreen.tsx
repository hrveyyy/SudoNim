import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PrescriptionView, type PrescriptionItem } from '@/components/PrescriptionView';
import { AppShell } from '@/components/layout/AppShell';
import { doctorNav } from '@/features/scan/doctorNav';
import type { prescriptions_row } from '@/types/rows';

interface Loaded {
  rx: prescriptions_row;
  patient: { surname: string | null; first_name: string | null; patient_code: string | null };
  items: PrescriptionItem[];
}

/**
 * Shared prescription detail + print. Used by both the doctor and the citizen
 * (RLS controls who can read it). Printing logs rx_print via record_rx_print.
 * Rendered inside whatever shell the caller provides (no AppShell here so it
 * can be embedded under either role's nav).
 */
export function PrescriptionDetail({ prescriptionId }: { prescriptionId: string }) {
  const { t } = useTranslation();

  const { data } = useQuery({
    queryKey: ['prescription', prescriptionId],
    queryFn: async (): Promise<Loaded | null> => {
      const { data: rx, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('id', prescriptionId)
        .maybeSingle();
      if (error || !rx) return null;
      const [{ data: patient }, { data: items }] = await Promise.all([
        supabase
          .from('patients')
          .select('surname, first_name, patient_code')
          .eq('id', rx.patient_id)
          .maybeSingle(),
        supabase
          .from('prescription_items')
          .select('*')
          .eq('prescription_id', prescriptionId)
          .order('line_no'),
      ]);
      return {
        rx,
        patient: patient ?? { surname: null, first_name: null, patient_code: null },
        items: (items ?? []) as PrescriptionItem[],
      };
    },
  });

  if (!data) return <p>{t('common.loading')}</p>;

  const print = async () => {
    await supabase.rpc('record_rx_print', { p_prescription_id: prescriptionId });
    window.print();
  };

  return (
    <div className="flex flex-col gap-3">
      <PrescriptionView
        patient={data.patient}
        physician_license={data.rx.physician_license}
        status={data.rx.status as 'issued' | 'cancelled'}
        issued_at={data.rx.issued_at}
        items={data.items}
      />
      <button
        type="button"
        onClick={() => void print()}
        className="min-h-touch self-start rounded-cl bg-primary px-4 font-semibold text-white print:hidden"
      >
        {t('prescriptions.print')}
      </button>
    </div>
  );
}

/** Doctor-shell wrapper for the prescription detail route. */
export default function PrescriptionDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  if (!id) return null;
  return (
    <AppShell title={t('prescriptions.title')} nav={doctorNav}>
      <PrescriptionDetail prescriptionId={id} />
    </AppShell>
  );
}
