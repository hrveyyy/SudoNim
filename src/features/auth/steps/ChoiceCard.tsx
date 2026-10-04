import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChoiceCardProps {
  /** Stable id prefix used for the aria-labelledby / aria-describedby wiring. */
  id: string;
  icon: LucideIcon;
  label: string;
  hint: string;
  /** Tailwind classes for the icon tile (role / status accent color). */
  accentClassName: string;
  onClick: () => void;
  /** Optional data attribute value, e.g. the role or status it represents. */
  value?: string;
}

/**
 * A large tappable choice used by the status and role steps. The accessible
 * name is the label only (aria-labelledby); the hint is the description. Color
 * only reinforces the text label, it never carries meaning on its own.
 */
export function ChoiceCard({
  id,
  icon: Icon,
  label,
  hint,
  accentClassName,
  onClick,
  value,
}: ChoiceCardProps) {
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;

  return (
    <button
      type="button"
      onClick={onClick}
      data-value={value}
      aria-labelledby={labelId}
      aria-describedby={hintId}
      className="group flex min-h-[88px] w-full items-center gap-4 rounded-[14px] border bg-card px-5 py-4 text-left shadow-soft transition-[border-color,box-shadow,transform] duration-150 hover:border-primary hover:shadow-lift motion-safe:hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span
        aria-hidden="true"
        className={cn('flex size-12 shrink-0 items-center justify-center rounded-[13px]', accentClassName)}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span id={labelId} className="block text-[1.05rem] font-semibold leading-snug">
          {label}
        </span>
        <span id={hintId} className="mt-0.5 block text-sm text-muted-foreground">
          {hint}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-5 shrink-0 text-muted-foreground transition-transform motion-safe:group-hover:translate-x-0.5"
      />
    </button>
  );
}
