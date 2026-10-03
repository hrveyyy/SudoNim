import { useTranslation } from 'react-i18next';
import type { screening_outcome } from '@/lib/risk';
import { outcomeLabelKey } from '@/lib/format';

/**
 * Screening outcome chip. Risk is NEVER conveyed by color alone — the text
 * label is always present; color only reinforces it (product guardrail).
 */
export function RiskChip({ outcome }: { outcome: screening_outcome | null }) {
  const { t } = useTranslation();

  const tone =
    outcome === 'needs_referral'
      ? 'bg-needs-referral-red'
      : outcome === 'monitor'
        ? 'bg-monitor-amber'
        : outcome === 'normal'
          ? 'bg-screened-green'
          : 'bg-text-muted';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-cl px-2.5 py-1 text-xs font-semibold text-white ${tone}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white/90" />
      {t(outcomeLabelKey(outcome))}
    </span>
  );
}
