import { ArrowRightLeft, Pill, QrCode, Users } from 'lucide-react';
import type { NavItem } from '@/components/layout/navTypes';

/** Physician navigation. */
export const doctorNav: NavItem[] = [
  { to: '/doctor/scan', labelKey: 'nav.scan', icon: QrCode },
  { to: '/doctor/patients', labelKey: 'nav.patients', icon: Users },
  { to: '/doctor/prescriptions', labelKey: 'nav.prescriptions', icon: Pill },
  { to: '/doctor/referrals', labelKey: 'nav.referrals', icon: ArrowRightLeft },
];
