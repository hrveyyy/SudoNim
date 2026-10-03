import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { adminNav } from '@/features/admin/adminNav';
import type { barangays_row } from '@/types/rows';

/**
 * Admin seeds a barangay_staff profile for an existing auth user (seed_bhw).
 * The admin creates the auth account out of band (dashboard) and pastes its
 * user id here, binding it to one barangay.
 */
export default function BhwSeedScreen() {
  const { t } = useTranslation();
  const [userId, setUserId] = useState('');
  const [barangayId, setBarangayId] = useState('');
  const [fullName, setFullName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: barangays = [] } = useQuery({
    queryKey: ['barangays'],
    queryFn: async (): Promise<barangays_row[]> => {
      const { data } = await supabase.from('barangays').select('*').order('name');
      return data ?? [];
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMsg(null);
    const { error } = await supabase.rpc('seed_bhw', {
      p_user_id: userId.trim(),
      p_barangay_id: barangayId,
      p_full_name: fullName.trim() || undefined,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMsg(t('admin.seed.submit'));
    setUserId('');
    setFullName('');
  };

  return (
    <AppShell title={t('admin.seed.title')} nav={adminNav}>
      <form
        onSubmit={onSubmit}
        className="flex max-w-md flex-col gap-3 rounded-cl border border-border bg-surface p-5"
      >
        <label htmlFor="uid" className="text-sm text-text-muted">
          {t('admin.seed.user_id')}
        </label>
        <input
          id="uid"
          className="min-h-touch rounded-cl border border-border bg-surface px-3 font-mono"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
        />
        <label htmlFor="brgy" className="text-sm text-text-muted">
          {t('admin.seed.barangay')}
        </label>
        <select
          id="brgy"
          className="min-h-touch rounded-cl border border-border bg-surface px-3"
          value={barangayId}
          onChange={(e) => setBarangayId(e.target.value)}
          required
        >
          <option value="">—</option>
          {barangays.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <label htmlFor="name" className="text-sm text-text-muted">
          {t('admin.seed.full_name')}
        </label>
        <input
          id="name"
          className="min-h-touch rounded-cl border border-border bg-surface px-3"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        {error && (
          <p role="alert" className="text-sm text-needs-referral-red">
            {error}
          </p>
        )}
        {msg && <p className="text-sm text-screened-green">{msg}</p>}

        <button
          type="submit"
          disabled={busy}
          className="min-h-touch rounded-cl bg-primary px-4 font-semibold text-white disabled:opacity-50"
        >
          {busy ? t('common.saving') : t('admin.seed.submit')}
        </button>
      </form>
    </AppShell>
  );
}
