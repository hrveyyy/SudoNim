import { CalendarDays, Eye, IdCard, Pill, ShieldCheck } from 'lucide-react';
import type { NavItem } from '@/components/layout/navTypes';

/** Citizen (patient) navigation. */
export const citizenNav: NavItem[] = [
  { to: '/me', labelKey: 'nav.health_card', icon: IdCard },
  { to: '/me/prescriptions', labelKey: 'nav.prescriptions', icon: Pill },
  { to: '/me/visits', labelKey: 'nav.visits', icon: CalendarDays },
  { to: '/me/access-history', labelKey: 'nav.access_history', icon: Eye },
  { to: '/me/consents', labelKey: 'nav.consents', icon: ShieldCheck },
];
