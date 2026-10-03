import type { NavItem } from '@/components/layout/navTypes';

/** Citizen (patient) navigation. */
export const citizenNav: NavItem[] = [
  { to: '/me', labelKey: 'nav.health_card', glyph: '🪪' },
  { to: '/me/prescriptions', labelKey: 'nav.prescriptions', glyph: '℞' },
  { to: '/me/visits', labelKey: 'nav.visits', glyph: '🗓' },
  { to: '/me/access-history', labelKey: 'nav.access_history', glyph: '👁' },
  { to: '/me/consents', labelKey: 'nav.consents', glyph: '✔' },
];
