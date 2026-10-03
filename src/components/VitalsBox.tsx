import { useTranslation } from 'react-i18next';
import { formatBp } from '@/lib/format';

export interface VitalsBoxProps {
  systolic: number | null;
  diastolic: number | null;
  fasting_glucose: number | null;
}

/** Compact read-only display of recorded vitals. */
export function VitalsBox({ systolic, diastolic, fasting_glucose }: VitalsBoxProps) {
  const { t } = useTranslation();
  return (
    <dl className="grid grid-cols-2 gap-3 rounded-cl border border-border bg-surface p-3">
      <div>
        <dt className="text-xs text-text-muted">{t('checkups.field.bp')}</dt>
        <dd className="text-lg font-semibold">{formatBp(systolic, diastolic)}</dd>
      </div>
      <div>
        <dt className="text-xs text-text-muted">{t('checkups.field.fasting_glucose')}</dt>
        <dd className="text-lg font-semibold">
          {fasting_glucose == null ? '—' : `${fasting_glucose} mg/dL`}
        </dd>
      </div>
    </dl>
  );
}
