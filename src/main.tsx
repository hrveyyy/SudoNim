import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import '@/styles/index.css';

// Offline sync is started by <StaffSync /> (src/app/StaffSync.tsx), only for
// signed-in barangay staff. It no longer runs for every visitor at load.

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
