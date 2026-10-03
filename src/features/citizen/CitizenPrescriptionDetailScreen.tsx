import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { citizenNav } from '@/features/citizen/citizenNav';
import { PrescriptionDetail } from '@/features/prescriptions/PrescriptionDetailScreen';

/** Citizen prescription view + print (record_rx_print logged on print). */
export default function CitizenPrescriptionDetailScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  return (
    <AppShell title={t('prescriptions.title')} nav={citizenNav}>
      {id && <PrescriptionDetail prescriptionId={id} />}
    </AppShell>
  );
}
