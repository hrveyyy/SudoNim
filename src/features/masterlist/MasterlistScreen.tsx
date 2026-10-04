import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronRight, Download, Search, UserPlus } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { patientName } from '@/lib/format';
import { AppShell } from '@/components/layout/AppShell';
import { staffNav } from '@/features/masterlist/staffNav';
import type { patients_row } from '@/types/rows';

type VerificationFilter = 'all' | 'verified' | 'unverified';

/**
 * Barangay masterlist. Real table with search + verification filter + CSV
 * export (audit-logged server-side when wired). RLS scopes rows to the staff
 * member's barangay. Rows link to the patient record.
 *
 * Note: this reads from Supabase directly for correctness; the offline-first
 * IndexedDB-first path (lib/db + outbox) is proven separately and can back this
 * list later without changing the UI.
 */
export default function MasterlistScreen() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<VerificationFilter>('all');

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['masterlist'],
    queryFn: async (): Promise<patients_row[]> => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('surname', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter((p) => {
      if (filter !== 'all' && p.verification_status !== filter) return false;
      if (!q) return true;
      const hay = `${p.surname ?? ''} ${p.first_name ?? ''} ${p.patient_code ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [patients, search, filter]);

  const exportCsv = () => {
    // Export contains patient names — confirm warning, then audit when wired.
    if (!window.confirm(t('masterlist.export_confirm'))) return;
    const rows = filtered.map((p) => ({
      patient_code: p.patient_code ?? '',
      surname: p.surname ?? '',
      first_name: p.first_name ?? '',
      sex: p.sex ?? '',
      verification_status: p.verification_status ?? '',
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'masterlist.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const controlClass =
    'min-h-touch rounded-[10px] border border-border-strong bg-secondary px-3 text-foreground transition-[border-color,box-shadow] hover:border-primary focus-visible:border-primary';

  return (
    <AppShell title={t('masterlist.title')} nav={staffNav}>
      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <label className="flex min-h-touch flex-1 items-center gap-2 rounded-[10px] border border-border-strong bg-secondary px-3 text-muted-foreground transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-[3px] focus-within:ring-ring/30">
          <Search aria-hidden="true" className="size-4 shrink-0" />
          <span className="sr-only">{t('masterlist.search_placeholder')}</span>
          <input
            type="search"
            placeholder={t('masterlist.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!min-h-0 min-w-0 flex-1 !border-0 !bg-transparent !p-0 text-foreground !shadow-none outline-none"
          />
        </label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as VerificationFilter)}
          className={controlClass}
          aria-label={t('masterlist.filter_label')}
        >
          <option value="all">{t('masterlist.filter.all')}</option>
          <option value="verified">{t('masterlist.filter.verified')}</option>
          <option value="unverified">{t('masterlist.filter.unverified')}</option>
        </select>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          to="/staff/patients/new"
          className="inline-flex min-h-touch items-center gap-2 rounded-[10px] bg-primary px-4 font-semibold text-primary-foreground no-underline shadow-[0_6px_16px_hsl(var(--primary)/0.3)] transition-transform hover:no-underline motion-safe:hover:-translate-y-px"
        >
          <UserPlus aria-hidden="true" className="size-4" />
          {t('masterlist.new_patient')}
        </Link>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex min-h-touch items-center gap-2 rounded-[10px] border border-border-strong !bg-card px-4 font-semibold !text-foreground transition-colors hover:border-primary hover:!bg-accent hover:!text-accent-foreground"
        >
          <Download aria-hidden="true" className="size-4" />
          {t('masterlist.export_csv')}
        </button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground shadow-soft">
          {t('masterlist.empty')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card p-2 shadow-soft sm:p-4">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{t('masterlist.title')}</caption>
            <thead>
              <tr className="text-left text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="rounded-l-lg bg-secondary px-3 py-2.5">{t('masterlist.col.name')}</th>
                <th className="bg-secondary px-3 py-2.5">{t('masterlist.col.code')}</th>
                <th className="bg-secondary px-3 py-2.5">{t('masterlist.col.status')}</th>
                <th className="rounded-r-lg bg-secondary px-3 py-2.5">
                  <span className="sr-only sm:not-sr-only">{t('masterlist.col.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const name = patientName(p.surname, p.first_name);
                const verified = p.verification_status === 'verified';
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/60">
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-soft text-[0.68rem] font-bold text-teal-ink"
                        >
                          {initials(p.first_name, p.surname)}
                        </span>
                        <span className="font-semibold">{name}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">
                      {p.patient_code ?? t('masterlist.code_pending')}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
                          verified ? 'bg-screened-soft text-screened-ink' : 'bg-monitor-soft text-monitor-ink'
                        }`}
                      >
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                        {verified ? t('masterlist.filter.verified') : t('masterlist.filter.unverified')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        to={`/staff/patients/${p.id}`}
                        className="inline-flex min-h-touch items-center gap-1 rounded-lg px-2 font-semibold text-primary"
                        aria-label={`${t('masterlist.open')}: ${name}`}
                      >
                        {t('masterlist.open')}
                        <ChevronRight aria-hidden="true" className="size-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

/** Two-letter avatar initials (decorative; the full name is always shown). */
function initials(first: string | null, last: string | null): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';
}
