import { LoginScreen } from '@/features/auth/LoginScreen';

// Admin portal is URL-only: it is deliberately NOT linked from the landing
// page or any other screen. Reachable only by typing /admin/login.
export default function AdminLogin() {
  return <LoginScreen expectedRole="admin" portalKey="admin" />;
}
