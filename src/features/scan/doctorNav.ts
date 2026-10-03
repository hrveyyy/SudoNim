import type { NavItem } from '@/components/layout/navTypes';

/** Physician navigation. */
export const doctorNav: NavItem[] = [
  { to: '/doctor/scan', labelKey: 'nav.scan', glyph: '⌖' },
  { to: '/doctor/patients', labelKey: 'nav.patients', glyph: '☰' },
  { to: '/doctor/prescriptions', labelKey: 'nav.prescriptions', glyph: '℞' },
  { to: '/doctor/referrals', labelKey: 'nav.referrals', glyph: '➜' },
];
