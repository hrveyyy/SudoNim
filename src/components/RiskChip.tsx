import { useTranslation } from 'react-i18next';
import type { screening_outcome } from '@/lib/risk';
import { outcomeLabelKey } from '@/lib/format';

/**
 * Screening outcome chip. Risk is NEVER conveyed by color alone — the text
 * label is always present; color only reinforces it (product guardrail).
 * Soft tint + darker ink keeps the label at WCAG AA contrast.
 */
export function RiskChip({ outcome }: { outcome: screening_outcome | null }) {
  const { t } = useTranslation();

  const tone =
    outcome === 'needs_referral'
      ? 'bg-referral-soft text-referral-ink'
      : outcome === 'monitor'
        ? 'bg-monitor-soft text-monitor-ink'
        : outcome === 'normal'
          ? 'bg-screened-soft text-screened-ink'
          : 'bg-secondary text-muted-foreground';

  return (
    <span
      className={`inline-flex min-h-[27px] w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {t(outcomeLabelKey(outcome))}
    </span>
  );
}
