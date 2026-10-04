import { BarChart3, ClipboardList, UserCheck, UserPlus } from 'lucide-react';
import type { NavItem } from '@/components/layout/navTypes';

/** Admin navigation. */
export const adminNav: NavItem[] = [
  { to: '/admin/doctor-approvals', labelKey: 'nav.doctor_approvals', icon: UserCheck },
  { to: '/admin/bhw-seed', labelKey: 'nav.bhw_seed', icon: UserPlus },
  { to: '/admin/reports', labelKey: 'nav.reports', icon: BarChart3 },
  { to: '/admin/audit', labelKey: 'nav.audit', icon: ClipboardList },
];
