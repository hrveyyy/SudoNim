import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { citizenNav } from '@/features/citizen/citizenNav';
import { useMyPatient } from '@/features/citizen/useMyPatient';
import { IdCard } from '@/components/IdCard';
import { patientName } from '@/lib/format';

/**
 * Citizen health card: the signed QR + name + code. The citizen can reset their
 * QR (reset_patient_qr bumps qr_version, invalidating old codes). Online only
 * (the QR is signed server-side). Birthdate never appears here.
 */
export default function HealthCardScreen() {
  const { t } = useTranslation();
  const { data: patient, isLoading } = useMyPatient();
  const qc = useQueryClient();
  const [payload, setPayload] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patient?.id) return;
    let active = true;
    setError(null);
    void supabase.functions
      .invoke('qr-sign', { body: { patient_id: patient.id } })
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data?.payload) setError(t('idcards.sign_failed'));
        else setPayload(data.payload as string);
      });
    return () => {
      active = false;
    };
  }, [patient?.id, t]);

  const resetQr = async () => {
    if (!patient) return;
    await supabase.rpc('reset_patient_qr', { p_patient_id: patient.id });
    setPayload(null);
    await qc.invalidateQueries({ queryKey: ['my_patient'] });
  };

  return (
    <AppShell title={t('citizen.health_card.title')} nav={citizenNav}>
      {isLoading ? (
        <p>{t('common.loading')}</p>
      ) : !patient ? (
        <p className="text-text-muted">{t('auth.pending.body')}</p>
      ) : (
        <div className="flex flex-col items-start gap-4">
          {error && <p className="text-sm text-needs-referral-red">{error}</p>}
          {payload ? (
            <IdCard
              surname={patient.surname}
              first_name={patient.first_name}
              patient_code={patient.patient_code ?? ''}
              payload={payload}
              wordmark="CareLink"
            />
          ) : (
            <div className="rounded-cl border border-border bg-surface p-4">
              <p className="font-medium">{patientName(patient.surname, patient.first_name)}</p>
              <p className="font-mono text-sm">{patient.patient_code}</p>
              <p className="text-sm text-text-muted">{t('common.loading')}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => void resetQr()}
            className="min-h-touch rounded-cl border border-border px-4"
          >
            {t('citizen.health_card.reset_qr')}
          </button>
        </div>
      )}
    </AppShell>
  );
}
