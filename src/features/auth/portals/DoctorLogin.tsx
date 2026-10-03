import { LoginScreen } from '@/features/auth/LoginScreen';

export default function DoctorLogin() {
  return <LoginScreen expectedRole="physician" portalKey="doctor" registerTo="/register/doctor" />;
}
