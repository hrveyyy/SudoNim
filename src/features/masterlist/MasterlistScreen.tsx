import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { enqueue } from '@/lib/outbox';
import { useAuth } from '@/features/auth/AuthProvider';
import { useOnline } from '@/hooks/useOnline';
import { useOutbox } from '@/hooks/useOutbox';
import { SyncBanner } from '@/features/sync';

/**
 * Minimal staff landing screen. The full masterlist (TanStack Table/Virtual,
 * search, filters, household grouping, export) is a later task. For now this
 * hosts the sync banner and lets us exercise the offline-first pipeline end to
 * end against the hosted DB with an authenticated barangay_staff session.
 */
export default function MasterlistScreen() {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  const online = useOnline();
  const { pending, failed } = useOutbox();

  // Patients cached locally (populated by delta pull after sync).
  const patients = useLiveQuery(() => db.patients.toArray(), [], []);

  const addDemoCheckup = () =>
    void enqueue({
      kind: 'checkup',
      payload: {
        id: crypto.randomUUID(),
        patient_id: patients[0]?.id ?? crypto.randomUUID(),
        barangay_id: profile?.barangay_id,
        checkup_date: new Date().toISOString().slice(0, 10),
      },
    });

  return (
    <main className="carelink-page">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{t('masterlist.title')}</h1>
        <button type="button" onClick={() => void signOut()} style={{ minHeight: 44 }}>
          {t('auth.action.sign_out')}
        </button>
      </header>

      <SyncBanner />

      <p style={{ marginTop: 12 }}>
        {t('masterlist.network')}: <strong>{online ? t('sync.online') : t('sync.offline')}</strong>{' '}
        · {t('masterlist.pending')}: <strong>{pending}</strong> · {t('masterlist.failed')}:{' '}
        <strong>{failed}</strong>
      </p>

      <section style={{ marginTop: 16 }}>
        <h2>{t('masterlist.patients')}</h2>
        {patients.length === 0 ? (
          <p>{t('masterlist.empty')}</p>
        ) : (
          <ul>
            {patients.map((p) => (
              <li key={p.id}>
                {p.surname}, {p.first_name} — {p.patient_code ?? t('masterlist.code_pending')}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button type="button" onClick={addDemoCheckup} style={{ minHeight: 44 }}>
          {t('masterlist.demo.enqueue_checkup')}
        </button>
      </div>
    </main>
  );
}
