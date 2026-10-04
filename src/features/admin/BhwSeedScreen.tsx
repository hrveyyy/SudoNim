import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { adminNav } from '@/features/admin/adminNav';
import type { barangays_row } from '@/types/rows';
import { seedErrorKey } from './seedErrors';

interface SeedResult {
  user_id: string;
  email: string;
  temporary_password: string;
  barangay_name: string;
}

/**
 * Admin creates a barangay_staff account in one step via the seed-bhw Edge
 * Function: the auth user (and its id) is generated server-side, bound to one
 * barangay, and a temporary password is shown once.
 */
export default function BhwSeedScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [barangayId, setBarangayId] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

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
    const { data, error: fnError } = await supabase.functions.invoke('seed-bhw', {
      body: {
        email: email.trim(),
        barangay_id: barangayId,
        full_name: fullName.trim() || undefined,
      },
    });
    setBusy(false);

    if (fnError || !data?.user_id) {
      let code: unknown = null;
      if (fnError instanceof FunctionsHttpError) {
        code = await (fnError.context as Response)
          .json()
          .then((b: { error?: unknown }) => b?.error)
          .catch(() => null);
      }
      setError(t(seedErrorKey(code)));
      return;
    }

    setResult({
      user_id: data.user_id as string,
      email: data.email as string,
      temporary_password: data.temporary_password as string,
      barangay_name: barangays.find((b) => b.id === barangayId)?.name ?? '',
    });
    setCopied(false);
    // Move focus to the result so screen readers announce it.
    requestAnimationFrame(() => resultRef.current?.focus());
  };

  const copyPassword = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.temporary_password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const createAnother = () => {
    // Drop the temporary password from memory once the admin moves on.
    setResult(null);
    setEmail('');
    setFullName('');
    setCopied(false);
    requestAnimationFrame(() => emailRef.current?.focus());
  };

  if (result) {
    return (
      <AppShell title={t('admin.seed.title')} nav={adminNav}>
        <div
          ref={resultRef}
          tabIndex={-1}
          role="status"
          className="flex max-w-md flex-col gap-4 rounded-cl border border-border bg-surface p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <h2 className="text-lg font-semibold text-screened-green">
            {t('admin.seed.success_title')}
          </h2>
          <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-text-muted">{t('admin.seed.email')}</dt>
            <dd className="break-all">{result.email}</dd>
            <dt className="text-text-muted">{t('admin.seed.barangay')}</dt>
            <dd>{result.barangay_name}</dd>
            <dt className="text-text-muted">{t('admin.seed.user_id')}</dt>
            <dd className="break-all font-mono text-xs">{result.user_id}</dd>
          </dl>

          <div className="flex flex-col gap-2 rounded-cl border border-monitor-amber p-3">
            <span id="tmp-pw-label" className="text-sm font-semibold">
              {t('admin.seed.temp_password')}
            </span>
            <div className="flex items-center gap-2">
              <code
                aria-labelledby="tmp-pw-label"
                className="flex-1 break-all rounded-cl bg-bg px-3 py-2 font-mono"
              >
                {result.temporary_password}
              </code>
              <button
                type="button"
                onClick={copyPassword}
                className="min-h-touch rounded-cl border border-border px-3 text-sm font-semibold"
              >
                {copied ? t('admin.seed.copied') : t('admin.seed.copy')}
              </button>
            </div>
            <p className="text-sm text-text-muted">{t('admin.seed.temp_password_hint')}</p>
          </div>

          <button
            type="button"
            onClick={createAnother}
            className="min-h-touch rounded-cl bg-primary px-4 font-semibold text-white"
          >
            {t('admin.seed.create_another')}
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={t('admin.seed.title')} nav={adminNav}>
      <form
        onSubmit={onSubmit}
        className="flex max-w-md flex-col gap-3 rounded-cl border border-border bg-surface p-5"
      >
        <p className="text-sm text-text-muted">{t('admin.seed.intro')}</p>

        <label htmlFor="email" className="text-sm text-text-muted">
          {t('admin.seed.email')}
        </label>
        <input
          id="email"
          ref={emailRef}
          type="email"
          autoComplete="off"
          className="min-h-touch rounded-cl border border-border bg-surface px-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          <option value="">{t('common.select')}</option>
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
          autoComplete="off"
          className="min-h-touch rounded-cl border border-border bg-surface px-3"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <p className="text-xs text-text-muted">{t('admin.seed.user_id_auto')}</p>

        {error && (
          <p role="alert" className="text-sm text-needs-referral-red">
            {error}
          </p>
        )}

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
