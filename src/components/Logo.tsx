import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface LogoProps {
  /** Icon-only lockup (no wordmark/tagline text beside it). */
  compact?: boolean;
  /** Show the small tagline under the wordmark. */
  tagline?: boolean;
  className?: string;
}

/**
 * CareLink brand lockup. The PNG artwork is dark, so in dark mode it sits on a
 * white disc to stay visible (pattern from the Figma prototype).
 */
export function Logo({ compact = false, tagline = false, className }: LogoProps) {
  const { t } = useTranslation();
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="grid size-11 shrink-0 place-items-center rounded-full dark:bg-white dark:shadow-soft">
        <img
          src="/carelinkpng.png"
          alt={compact ? t('app.name') : ''}
          className="size-[86%] object-contain dark:size-[78%]"
        />
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <strong className="font-heading text-lg font-bold tracking-tight text-heading">
            {t('app.name')}
          </strong>
          {tagline && (
            <small className="text-xs text-muted-foreground">{t('common.tagline')}</small>
          )}
        </span>
      )}
    </span>
  );
}
