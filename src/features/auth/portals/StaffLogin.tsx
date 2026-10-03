import { LoginScreen } from '@/features/auth/LoginScreen';

// Barangay staff accounts are seeded by admin; no self-registration link.
export default function StaffLogin() {
  return <LoginScreen expectedRole="barangay_staff" portalKey="staff" />;
}
