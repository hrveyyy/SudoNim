import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface StepIndicatorProps {
  current: number;
  total: number;
}

/** "Step 1 of 2" text plus a segmented bar. The text carries the meaning. */
export function StepIndicator({ current, total }: StepIndicatorProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 flex items-center gap-3">
      <div aria-hidden="true" className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 w-8 rounded-full transition-colors',
              i < current ? 'bg-primary' : 'bg-border',
            )}
          />
        ))}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('auth.wizard.step', { current, total })}
      </p>
    </div>
  );
}
