import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { AppShell } from '@/components/layout/AppShell';
import { staffNav } from '@/features/masterlist/staffNav';
import { SyncBanner } from '@/features/sync/SyncBanner';
import { db } from '@/lib/db';

/** Staff sync screen: banner + outbox queue detail + conflict notices. */
export default function SyncScreen() {
  const { t } = useTranslation();
  const items = useLiveQuery(() => db.outbox.orderBy('seq').toArray(), [], []);

  return (
    <AppShell title={t('nav.sync')} nav={staffNav}>
      <div className="mb-4">
        <SyncBanner />
      </div>

      <h2 className="mb-2 font-heading font-semibold">{t('sync.queue.title')}</h2>
      {items.length === 0 ? (
        <p className="text-text-muted">{t('sync.queue.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li
              key={it.seq}
              className="flex items-center justify-between rounded-cl border border-border bg-surface p-3 text-sm"
            >
              <span>{it.kind}</span>
              <span className="rounded-cl bg-bg px-2 py-0.5 text-xs">{it.status}</span>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
