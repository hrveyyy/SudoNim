import { ArrowRightLeft, IdCard, LayoutDashboard, ListChecks, RefreshCw } from 'lucide-react';
import type { NavItem } from '@/components/layout/navTypes';

/** Barangay staff navigation (used by the staff AppShell). */
export const staffNav: NavItem[] = [
  { to: '/staff/masterlist', labelKey: 'nav.masterlist', icon: ListChecks },
  { to: '/staff/referrals', labelKey: 'nav.referrals', icon: ArrowRightLeft },
  { to: '/staff/id-cards', labelKey: 'nav.id_cards', icon: IdCard },
  { to: '/staff/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/staff/sync', labelKey: 'nav.sync', icon: RefreshCw },
];
