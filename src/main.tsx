import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { registerSyncTriggers } from '@/features/sync';
import '@/styles/index.css';

// Wire the offline-first flush triggers (app start, online event, Background Sync).
registerSyncTriggers();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
