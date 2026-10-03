import { useTranslation } from 'react-i18next';
import { formatManila } from '@/lib/dates';
import { patientName } from '@/lib/format';

export interface PrescriptionItem {
  line_no: number;
  drug_name: string;
  strength: string | null;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  quantity: string | null;
  instructions: string | null;
}

export interface PrescriptionViewProps {
  patient: { surname: string | null; first_name: string | null; patient_code: string | null };
  physician_license: string;
  status: 'issued' | 'cancelled';
  issued_at: string;
  items: PrescriptionItem[];
}

/**
 * Read-only prescription view (A5 print). No diagnosis field. Clearly labeled a
 * demo; states controlled drugs are not supported. Prescriptions are immutable.
 */
export function PrescriptionView({
  patient,
  physician_license,
  status,
  issued_at,
  items,
}: PrescriptionViewProps) {
  const { t } = useTranslation();
  return (
    <article className="cl-prescription mx-auto max-w-prose rounded-cl border border-border bg-white p-6 text-black">
      <header className="mb-4 border-b border-border pb-3">
        <h1 className="font-heading text-xl font-bold">{t('prescriptions.title')}</h1>
        <p className="text-xs text-text-muted">{t('prescriptions.demo_notice')}</p>
      </header>

      <dl className="mb-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-text-muted">{t('prescriptions.patient')}</dt>
          <dd className="font-medium">{patientName(patient.surname, patient.first_name)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">{t('masterlist.code')}</dt>
          <dd className="font-mono">{patient.patient_code ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-text-muted">{t('prescriptions.license')}</dt>
          <dd className="font-mono">{physician_license}</dd>
        </div>
        <div>
          <dt className="text-text-muted">{t('prescriptions.issued_at')}</dt>
          <dd>{formatManila(issued_at)}</dd>
        </div>
      </dl>

      {status === 'cancelled' && (
        <p className="mb-3 rounded-cl bg-needs-referral-red/10 px-3 py-2 text-sm font-semibold text-needs-referral-red">
          {t('prescriptions.cancelled')}
        </p>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-1 pr-2">#</th>
            <th className="py-1 pr-2">{t('prescriptions.item.drug')}</th>
            <th className="py-1 pr-2">{t('prescriptions.item.dosage')}</th>
            <th className="py-1 pr-2">{t('prescriptions.item.frequency')}</th>
            <th className="py-1">{t('prescriptions.item.duration')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.line_no} className="border-b border-border/60 align-top">
              <td className="py-1 pr-2">{it.line_no}</td>
              <td className="py-1 pr-2">
                <div className="font-medium">{it.drug_name}</div>
                {it.strength && <div className="text-text-muted">{it.strength}</div>}
                {it.instructions && <div className="text-text-muted">{it.instructions}</div>}
              </td>
              <td className="py-1 pr-2">{it.dosage ?? '—'}</td>
              <td className="py-1 pr-2">{it.frequency ?? '—'}</td>
              <td className="py-1">{it.duration ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 text-xs text-text-muted">{t('prescriptions.no_controlled')}</p>
    </article>
  );
}
