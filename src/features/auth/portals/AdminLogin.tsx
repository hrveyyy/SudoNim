import { SignInForm } from '@/features/auth/SignInForm';
import { AuthLayout } from '@/features/auth/AuthLayout';

// Admin portal is URL-only: it is deliberately NOT linked from the landing
// page, the login wizard, or any other screen. Reachable only by typing
// /admin/login. There is no back control (no onBack) because there is no
// public entry point to return to.
//
// SignInForm shows the generic auth.login.failed on any auth failure, so the
// admin failure path never discloses whether an admin account exists. On
// success it navigates to '/', and the guard routes admin to
// roleHome('admin') = '/admin/doctor-approvals'.
export default function AdminLogin() {
  return (
    <AuthLayout>
      <SignInForm expectedRole="admin" />
    </AuthLayout>
  );
}
