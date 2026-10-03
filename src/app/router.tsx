import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireRole } from '@/app/guards/RequireRole';

// Public screens (default exports for lazy loading).
const LandingScreen = lazy(() => import('@/features/auth/LandingScreen'));
const CitizenLogin = lazy(() => import('@/features/auth/portals/CitizenLogin'));
const StaffLogin = lazy(() => import('@/features/auth/portals/StaffLogin'));
const DoctorLogin = lazy(() => import('@/features/auth/portals/DoctorLogin'));
const AdminLogin = lazy(() => import('@/features/auth/portals/AdminLogin'));
const RegisterScreen = lazy(() => import('@/features/auth/RegisterScreen'));
const DoctorRegisterScreen = lazy(() => import('@/features/auth/DoctorRegisterScreen'));
const PendingScreen = lazy(() => import('@/features/auth/PendingScreen'));

// Role-guarded screens.
const MasterlistScreen = lazy(() => import('@/features/masterlist/MasterlistScreen'));

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  // Landing with three role options (admin not shown).
  { path: '/', element: <Lazy><LandingScreen /></Lazy> },

  // Login portals (one auth mechanism, role-gated per entry point).
  { path: '/login', element: <Lazy><CitizenLogin /></Lazy> },
  { path: '/login/staff', element: <Lazy><StaffLogin /></Lazy> },
  { path: '/login/doctor', element: <Lazy><DoctorLogin /></Lazy> },
  // Admin portal: URL-only, not linked anywhere.
  { path: '/admin/login', element: <Lazy><AdminLogin /></Lazy> },

  // Registration (citizen + doctor only; BHW is seeded by admin).
  { path: '/register', element: <Lazy><RegisterScreen /></Lazy> },
  { path: '/register/doctor', element: <Lazy><DoctorRegisterScreen /></Lazy> },

  { path: '/pending', element: <Lazy><PendingScreen /></Lazy> },

  // Barangay staff (offline-first). Full route group grows in later tasks.
  {
    path: '/staff/masterlist',
    element: (
      <RequireRole allow={['barangay_staff']}>
        <Lazy><MasterlistScreen /></Lazy>
      </RequireRole>
    ),
  },

  // Fallback -> landing.
  { path: '*', element: <Navigate to="/" replace /> },
]);
