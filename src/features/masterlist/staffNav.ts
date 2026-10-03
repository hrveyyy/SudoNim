import type { NavItem } from '@/components/layout/navTypes';

/** Barangay staff navigation (used by the staff AppShell). */
export const staffNav: NavItem[] = [
  { to: '/staff/masterlist', labelKey: 'nav.masterlist', glyph: '≡' },
  { to: '/staff/referrals', labelKey: 'nav.referrals', glyph: '➜' },
  { to: '/staff/id-cards', labelKey: 'nav.id_cards', glyph: '▭' },
  { to: '/staff/dashboard', labelKey: 'nav.dashboard', glyph: '▦' },
  { to: '/staff/sync', labelKey: 'nav.sync', glyph: '⟳' },
];
