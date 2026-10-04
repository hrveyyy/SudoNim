import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, roleHome, type user_role } from '@/features/auth/AuthProvider';

/**
 * Convenience route guard. NOT the security boundary — access control is
 * enforced in the database (RLS + RPCs). This only improves navigation UX.
 *
 * - Not signed in -> /login (preserving where they were headed).
 * - Signed in but wrong role -> their own role home.
 */
export function RequireRole({
  allow,
  children,
}: {
  allow: user_role[];
  children: ReactNode;
}) {
  const { loading, session, profile } = useAuth();
  const location = useLocation();

  if (loading) return null; // could render a spinner

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!profile) {
    // Signed in but no profile row (e.g. doctor applicant awaiting approval).
    return <Navigate to="/pending" replace />;
  }

  if (!allow.includes(profile.role)) {
    return <Navigate to={roleHome(profile.role)} replace />;
  }

  return <>{children}</>;
}
