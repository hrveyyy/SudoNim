import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  /** i18n key for the label. */
  labelKey: string;
  /** Decorative icon shown beside the label (lucide-react). */
  icon: LucideIcon;
}
