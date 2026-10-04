import { RouterProvider } from 'react-router-dom';
import { Providers } from '@/app/providers';
import { router } from '@/app/router';
import { StaffSync } from '@/app/StaffSync';

export function App() {
  return (
    <Providers>
      {/* Offline sync runs only while a barangay staff member is signed in. */}
      <StaffSync />
      <RouterProvider router={router} />
    </Providers>
  );
}
