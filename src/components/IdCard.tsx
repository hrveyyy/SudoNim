import { QrCard } from '@/components/QrCard';
import { patientName } from '@/lib/format';

export interface IdCardProps {
  surname: string | null;
  first_name: string | null;
  patient_code: string;
  /** Signed QR payload for this card. */
  payload: string;
  /** Optional small wordmark/barangay label (no return address by default). */
  wordmark?: string;
}

/**
 * Printed ID card (CR80). Carries ONLY name, patient code, QR, and an optional
 * wordmark. Birthdates NEVER appear on printouts (product guardrail).
 *
 * The @page CR80 sizing lives in idcards print styles; this is the visual card.
 */
export function IdCard({ surname, first_name, patient_code, payload, wordmark }: IdCardProps) {
  return (
    <div className="cl-idcard flex items-center gap-4 rounded-cl border border-border bg-white p-4 text-black">
      <QrCard payload={payload} size={120} />
      <div className="min-w-0">
        {wordmark && <p className="text-xs font-semibold text-primary">{wordmark}</p>}
        <p className="truncate text-lg font-bold font-heading">
          {patientName(surname, first_name)}
        </p>
        <p className="font-mono text-sm">{patient_code}</p>
      </div>
    </div>
  );
}
