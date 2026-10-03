import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/lib/i18n';
import { registerSyncTriggers } from '@/features/sync';
import { SyncDemo } from '@/features/sync/SyncDemo';

// Wire the offline-first flush triggers (app start, online event, Background Sync).
registerSyncTriggers();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <SyncDemo />
  </StrictMode>,
);
