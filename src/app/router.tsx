import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireRole } from '@/app/guards/RequireRole';

// Public screens.
const LandingScreen = lazy(() => import('@/features/auth/LandingScreen'));
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const AdminLogin = lazy(() => import('@/features/auth/portals/AdminLogin'));
const RegisterScreen = lazy(() => import('@/features/auth/RegisterScreen'));
const DoctorRegisterScreen = lazy(() => import('@/features/auth/DoctorRegisterScreen'));
const PendingScreen = lazy(() => import('@/features/auth/PendingScreen'));

// Staff screens.
const MasterlistScreen = lazy(() => import('@/features/masterlist/MasterlistScreen'));
const PatientNewScreen = lazy(() => import('@/features/patients/PatientNewScreen'));
const PatientRecordScreen = lazy(() => import('@/features/patients/PatientRecordScreen'));
const CheckupNewScreen = lazy(() => import('@/features/checkups/CheckupNewScreen'));
const ReferralsListScreen = lazy(() => import('@/features/referrals/ReferralsListScreen'));
const ReferralNewScreen = lazy(() => import('@/features/referrals/ReferralNewScreen'));
const ReferralDetailScreen = lazy(() => import('@/features/referrals/ReferralDetailScreen'));
const IdCardsScreen = lazy(() => import('@/features/idcards/IdCardsScreen'));
const DashboardScreen = lazy(() => import('@/features/dashboard/DashboardScreen'));
const ReportsScreen = lazy(() => import('@/features/dashboard/ReportsScreen'));
const SyncScreen = lazy(() => import('@/features/sync/SyncScreen'));

// Doctor screens.
const ScanScreen = lazy(() => import('@/features/scan/ScanScreen'));
const DoctorPatientsListScreen = lazy(
  () => import('@/features/patients/DoctorPatientsListScreen'),
);
const DoctorPatientRecordScreen = lazy(
  () => import('@/features/patients/DoctorPatientRecordScreen'),
);
const PrescriptionNewScreen = lazy(
  () => import('@/features/prescriptions/PrescriptionNewScreen'),
);
const PrescriptionDetailScreen = lazy(
  () => import('@/features/prescriptions/PrescriptionDetailScreen'),
);
const DoctorPrescriptionsListScreen = lazy(
  () => import('@/features/prescriptions/DoctorPrescriptionsListScreen'),
);
const NoteNewScreen = lazy(() => import('@/features/prescriptions/NoteNewScreen'));
const DoctorReferralsListScreen = lazy(
  () => import('@/features/referrals/DoctorReferralsListScreen'),
);

// Citizen screens.
const HealthCardScreen = lazy(() => import('@/features/citizen/HealthCardScreen'));
const CitizenPrescriptionsScreen = lazy(
  () => import('@/features/citizen/CitizenPrescriptionsScreen'),
);
const CitizenPrescriptionDetailScreen = lazy(
  () => import('@/features/citizen/CitizenPrescriptionDetailScreen'),
);
const CitizenVisitsScreen = lazy(() => import('@/features/citizen/CitizenVisitsScreen'));
const CitizenNotesScreen = lazy(() => import('@/features/citizen/CitizenNotesScreen'));
const AccessHistoryScreen = lazy(() => import('@/features/citizen/AccessHistoryScreen'));
const ConsentsScreen = lazy(() => import('@/features/citizen/ConsentsScreen'));

// Admin screens.
const DoctorApprovalsScreen = lazy(() => import('@/features/admin/DoctorApprovalsScreen'));
const BhwSeedScreen = lazy(() => import('@/features/admin/BhwSeedScreen'));
const AdminReportsScreen = lazy(() => import('@/features/admin/AdminReportsScreen'));
const AuditScreen = lazy(() => import('@/features/admin/AuditScreen'));

function L({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

function staff(node: React.ReactNode) {
  return <RequireRole allow={['barangay_staff']}><L>{node}</L></RequireRole>;
}
function doctor(node: React.ReactNode) {
  return <RequireRole allow={['physician']}><L>{node}</L></RequireRole>;
}
function citizen(node: React.ReactNode) {
  return <RequireRole allow={['citizen']}><L>{node}</L></RequireRole>;
}
function admin(node: React.ReactNode) {
  return <RequireRole allow={['admin']}><L>{node}</L></RequireRole>;
}

export const router = createBrowserRouter([
  { path: '/', element: <L><LandingScreen /></L> },

  // Login wizard (one auth mechanism; role selection is internalized).
  // Old per-role portal URLs redirect to it.
  { path: '/login', element: <L><LoginPage /></L> },
  { path: '/login/staff', element: <Navigate to="/login" replace /> },
  { path: '/login/doctor', element: <Navigate to="/login" replace /> },
  // Admin portal: URL-only, not linked anywhere.
  { path: '/admin/login', element: <L><AdminLogin /></L> },
  { path: '/register', element: <L><RegisterScreen /></L> },
  { path: '/register/doctor', element: <L><DoctorRegisterScreen /></L> },
  { path: '/pending', element: <L><PendingScreen /></L> },

  // Staff (/staff/...).
  { path: '/staff/masterlist', element: staff(<MasterlistScreen />) },
  { path: '/staff/patients/new', element: staff(<PatientNewScreen />) },
  { path: '/staff/patients/:id', element: staff(<PatientRecordScreen />) },
  { path: '/staff/checkups/new', element: staff(<CheckupNewScreen />) },
  { path: '/staff/referrals', element: staff(<ReferralsListScreen />) },
  { path: '/staff/referrals/new', element: staff(<ReferralNewScreen />) },
  { path: '/staff/referrals/:id', element: staff(<ReferralDetailScreen />) },
  { path: '/staff/id-cards', element: staff(<IdCardsScreen />) },
  { path: '/staff/dashboard', element: staff(<DashboardScreen />) },
  { path: '/staff/reports', element: staff(<ReportsScreen />) },
  { path: '/staff/sync', element: staff(<SyncScreen />) },

  // Doctor (/doctor/...).
  { path: '/doctor/scan', element: doctor(<ScanScreen />) },
  { path: '/doctor/patients', element: doctor(<DoctorPatientsListScreen />) },
  { path: '/doctor/patients/:id', element: doctor(<DoctorPatientRecordScreen />) },
  { path: '/doctor/patients/:id/prescriptions/new', element: doctor(<PrescriptionNewScreen />) },
  { path: '/doctor/patients/:id/notes/new', element: doctor(<NoteNewScreen />) },
  { path: '/doctor/prescriptions', element: doctor(<DoctorPrescriptionsListScreen />) },
  { path: '/doctor/prescriptions/:id', element: doctor(<PrescriptionDetailScreen />) },
  { path: '/doctor/referrals', element: doctor(<DoctorReferralsListScreen />) },

  // Citizen (/me/...).
  { path: '/me', element: citizen(<HealthCardScreen />) },
  { path: '/me/prescriptions', element: citizen(<CitizenPrescriptionsScreen />) },
  { path: '/me/prescriptions/:id', element: citizen(<CitizenPrescriptionDetailScreen />) },
  { path: '/me/visits', element: citizen(<CitizenVisitsScreen />) },
  { path: '/me/notes', element: citizen(<CitizenNotesScreen />) },
  { path: '/me/access-history', element: citizen(<AccessHistoryScreen />) },
  { path: '/me/consents', element: citizen(<ConsentsScreen />) },

  // Admin (/admin/...).
  { path: '/admin/doctor-approvals', element: admin(<DoctorApprovalsScreen />) },
  { path: '/admin/bhw-seed', element: admin(<BhwSeedScreen />) },
  { path: '/admin/reports', element: admin(<AdminReportsScreen />) },
  { path: '/admin/audit', element: admin(<AuditScreen />) },

  // Fallback -> landing.
  { path: '*', element: <Navigate to="/" replace /> },
]);
