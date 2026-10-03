import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { staffNav } from '@/features/masterlist/staffNav';
import { IdCard } from '@/components/IdCard';
import { patientName } from '@/lib/format';
import type { patients_row } from '@/types/rows';

/**
 * ID-card printing (ONLINE only — the QR is signed on the server). Staff picks
 * a patient, we fetch a signed payload from the qr-sign Edge Function, render
 * the CR80 card, and log the print via record_card_prints.
 */
export default function IdCardsScreen() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<patients_row | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: patients = [] } = useQuery({
    queryKey: ['masterlist', 'withcode'],
    queryFn: async (): Promise<patients_row[]> => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .not('patient_code', 'is', null)
        .order('surname');
      if (error) throw error;
      return data ?? [];
    },
  });

  const prepare = async (p: patients_row) => {
    setSelected(p);
    setPayload(null);
    setError(null);
    setBusy(true);
    // Ask the server to sign a payload for this patient's current qr_version.
    const { data, error } = await supabase.functions.invoke('qr-sign', {
      body: { patient_id: p.id },
    });
    setBusy(false);
    if (error || !data?.payload) {
      setError(t('idcards.sign_failed'));
      return;
    }
    setPayload(data.payload as string);
  };

  const printCard = async () => {
    if (!selected) return;
    // Log the print (confirm warning first — printouts carry names).
    if (!window.confirm(t('idcards.print_confirm'))) return;
    await supabase.rpc('record_card_prints', { p_patient_id: selected.id, p_batch_size: 1 });
    window.print();
  };

  return (
    <AppShell title={t('idcards.title')} nav={staffNav}>
      <p className="mb-3 text-sm text-text-muted">{t('idcards.online_only')}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-heading font-semibold">{t('idcards.pick_patient')}</h2>
          <ul className="flex max-h-96 flex-col gap-1 overflow-auto">
            {patients.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => void prepare(p)}
                  className={`flex w-full items-center justify-between rounded-cl border px-3 py-2 text-left ${
                    selected?.id === p.id ? 'border-primary' : 'border-border'
                  }`}
                >
                  <span>{patientName(p.surname, p.first_name)}</span>
                  <span className="font-mono text-xs">{p.patient_code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-2 font-heading font-semibold">{t('idcards.preview')}</h2>
          {busy && <p>{t('common.loading')}</p>}
          {error && <p className="text-needs-referral-red text-sm">{error}</p>}
          {selected && payload && (
            <div className="flex flex-col gap-3">
              <IdCard
                surname={selected.surname}
                first_name={selected.first_name}
                patient_code={selected.patient_code!}
                payload={payload}
                wordmark="CareLink"
              />
              <button
                type="button"
                onClick={() => void printCard()}
                className="min-h-touch rounded-cl bg-primary px-4 font-semibold text-white"
              >
                {t('idcards.print')}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
