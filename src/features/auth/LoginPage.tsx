import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth, roleHome } from '@/features/auth/AuthProvider';
import { SignInForm } from '@/features/auth/SignInForm';
import { StatusStep, type visitor_status } from '@/features/auth/steps/StatusStep';
import { RoleStep, type selectable_role } from '@/features/auth/steps/RoleStep';
import { AuthLayout } from '@/features/auth/AuthLayout';

/**
 * One stage of the login wizard. The `signin` step carries the pinned role so
 * the sign-in form admits only that role.
 */
type wizard_step =
  | { kind: 'status' }
  | { kind: 'role' }
  | { kind: 'signin'; role: selectable_role };

/** Transient wizard state, held in component memory (not the URL). */
interface login_wizard_state {
  status: visitor_status | null;
  step: wizard_step;
}

/**
 * LoginPage: the staged login wizard (status -> role -> outcome). State lives
 * entirely in component memory; registration outcomes navigate to existing
 * routes, while sign-in and the BHW notice render in place. Back navigation
 * preserves the previously chosen status (and role) at every step.
 *
 * Lazy-loaded route component, so this is a default export per project
 * convention.
 */
export default function LoginPage() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState<login_wizard_state>({
    status: null,
    step: { kind: 'status' },
  });

  // Already signed in with a resolved profile -> skip the wizard and let the
  // visitor land on their role home, consistent with the landing/login screens.
  if (!loading && session && profile) {
    return <Navigate to={roleHome(profile.role)} replace />;
  }

  // Status_Step: record the status and advance to the role step (Req 2.3).
  const selectStatus = (status: visitor_status) =>
    setState({ status, step: { kind: 'role' } });

  // Status_Step back: return to the landing page, discard the status (Req 2.5).
  const backToLanding = () => navigate('/');

  // Role_Step back: keep the status, return to the status step (Req 3.4).
  const backToStatus = () =>
    setState((prev) => ({ ...prev, step: { kind: 'status' } }));

  // signin back: keep status (and role), return to the role step
  // (Req 4 back control).
  const backToRole = () =>
    setState((prev) => ({ ...prev, step: { kind: 'role' } }));

  // Role_Step select: resolve the outcome from (status, role) (Req 4, 5).
  const selectRole = (role: selectable_role) => {
    if (state.status === 'returning') {
      setState((prev) => ({ ...prev, step: { kind: 'signin', role } }));
      return;
    }
    // status === 'new'. RoleStep doesn't offer barangay_staff here: BHW
    // accounts are seeded by an admin, never set up in the public flow.
    switch (role) {
      case 'citizen':
        navigate('/register');
        return;
      case 'physician':
        navigate('/register/doctor');
        return;
      case 'barangay_staff':
        return;
    }
  };

  // Null-status guard: if we ever hold a non-status step without a status,
  // fall back to the status step so role selection can never run first
  // (Req 3.6).
  const step: wizard_step =
    state.step.kind !== 'status' && state.status === null
      ? { kind: 'status' }
      : state.step;

  const content = (() => {
    switch (step.kind) {
      case 'status':
        return <StatusStep onSelect={selectStatus} onBack={backToLanding} />;
      case 'role':
        return <RoleStep onSelect={selectRole} onBack={backToStatus} status={state.status} />;
      case 'signin':
        return <SignInForm expectedRole={step.role} onBack={backToRole} />;
    }
  })();

  // `key` remounts the step so its enter animation replays on every transition.
  return (
    <AuthLayout>
      <div key={step.kind}>{content}</div>
    </AuthLayout>
  );
}
