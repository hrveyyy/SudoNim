import { useTranslation } from 'react-i18next';
import { enqueue } from '@/lib/outbox';
import { useOnline } from '@/hooks/useOnline';
import { useOutbox } from '@/hooks/useOutbox';
import { SyncBanner } from './SyncBanner';

/**
 * Minimal dev-only harness to exercise the offline-first layer in the browser
 * until the real staff app shell + router exist. It is NOT a product screen:
 * it only enqueues demo rows so the outbox and SyncBanner can be observed.
 *
 * Demo data only — no PHI. Toggle your browser's offline mode (DevTools >
 * Network > Offline) to see "Offline, N changes waiting", then go back online
 * and press "Sync now".
 */
export function SyncDemo() {
  const { t } = useTranslation();
  const online = useOnline();
  const { pending, failed } = useOutbox();

  const addCheckup = () =>
    void enqueue({
      kind: 'checkup',
      payload: { id: crypto.randomUUID(), patient_id: 'demo-patient', checkup_date: '2026-01-01' },
    });

  const addPatient = () =>
    void enqueue({
      kind: 'patient',
      payload: { id: crypto.randomUUID(), updated_at: new Date().toISOString() },
    });

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <h1>CareLink — offline-first layer (dev harness)</h1>

      <SyncBanner />

      <p style={{ marginTop: 16 }}>
        Network: <strong>{online ? 'online' : 'offline'}</strong> · pending:{' '}
        <strong>{pending}</strong> · failed: <strong>{failed}</strong>
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <button type="button" onClick={addCheckup} style={{ minHeight: 44 }}>
          Enqueue demo check-up (append-only)
        </button>
        <button type="button" onClick={addPatient} style={{ minHeight: 44 }}>
          Enqueue demo patient edit (last-write-wins)
        </button>
      </div>

      <p style={{ marginTop: 16, color: '#555' }}>
        {/* Not translated: dev harness note, never shipped to users. */}
        Tip: open DevTools &rarr; Network &rarr; Offline to simulate loss of
        connectivity. The banner key currently reads: &ldquo;{t('sync.action.sync_now')}&rdquo;.
      </p>
    </main>
  );
}
