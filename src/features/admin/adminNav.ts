import type { NavItem } from '@/components/layout/navTypes';

/** Admin navigation. */
export const adminNav: NavItem[] = [
  { to: '/admin/doctor-approvals', labelKey: 'nav.doctor_approvals', glyph: '✔' },
  { to: '/admin/bhw-seed', labelKey: 'nav.bhw_seed', glyph: '+' },
  { to: '/admin/reports', labelKey: 'nav.reports', glyph: '▦' },
  { to: '/admin/audit', labelKey: 'nav.audit', glyph: '🗒' },
];
