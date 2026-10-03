import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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

  return (
    <AppShell title={t('masterlist.title')} nav={staffNav}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder={t('masterlist.search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-touch flex-1 rounded-cl border border-border bg-surface px-3"
          aria-label={t('masterlist.search_placeholder')}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as VerificationFilter)}
          className="min-h-touch rounded-cl border border-border bg-surface px-3"
          aria-label={t('masterlist.filter_label')}
        >
          <option value="all">{t('masterlist.filter.all')}</option>
          <option value="verified">{t('masterlist.filter.verified')}</option>
          <option value="unverified">{t('masterlist.filter.unverified')}</option>
        </select>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Link
          to="/staff/patients/new"
          className="min-h-touch rounded-cl bg-primary px-4 py-2 font-semibold text-white"
        >
          {t('masterlist.new_patient')}
        </Link>
        <button
          type="button"
          onClick={exportCsv}
          className="min-h-touch rounded-cl border border-border px-4 py-2"
        >
          {t('masterlist.export_csv')}
        </button>
      </div>

      {isLoading ? (
        <p>{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <p className="text-text-muted">{t('masterlist.empty')}</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{t('masterlist.title')}</caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-2">{t('masterlist.col.name')}</th>
              <th className="py-2 pr-2">{t('masterlist.col.code')}</th>
              <th className="py-2 pr-2">{t('masterlist.col.status')}</th>
              <th className="py-2">{t('masterlist.col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-border/60">
                <td className="py-2 pr-2 font-medium">{patientName(p.surname, p.first_name)}</td>
                <td className="py-2 pr-2 font-mono">
                  {p.patient_code ?? t('masterlist.code_pending')}
                </td>
                <td className="py-2 pr-2">
                  {p.verification_status === 'verified'
                    ? t('masterlist.filter.verified')
                    : t('masterlist.filter.unverified')}
                </td>
                <td className="py-2">
                  <Link to={`/staff/patients/${p.id}`} className="text-primary">
                    {t('masterlist.open')}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
