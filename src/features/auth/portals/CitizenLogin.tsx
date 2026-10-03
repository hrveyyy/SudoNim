import { LoginScreen } from '@/features/auth/LoginScreen';

export default function CitizenLogin() {
  return <LoginScreen expectedRole="citizen" portalKey="citizen" registerTo="/register" />;
}
