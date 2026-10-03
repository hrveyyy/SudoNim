import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { staffNav } from '@/features/masterlist/staffNav';
import { RiskChip } from '@/components/RiskChip';
import { compute_risk } from '@/lib/risk';
import { useRiskRules } from '@/hooks/useRiskRules';
import { todayManila } from '@/lib/dates';
import type { patients_row } from '@/types/rows';

/**
 * Check-up form with a LIVE client risk preview (mirror of compute_risk). The
 * server recomputes authoritatively on insert via the checkups trigger, so the
 * preview is advisory only. Append-only: a new row per screening.
 */
export default function CheckupNewScreen() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const patientId = params.get('patient') ?? '';
  const navigate = useNavigate();
  const rules = useRiskRules();

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [glucose, setGlucose] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    enabled: !!patientId,
    queryFn: async (): Promise<patients_row | null> => {
      const { data } = await supabase.from('patients').select('*').eq('id', patientId).maybeSingle();
      return data;
    },
  });

  const num = (s: string): number | null => (s.trim() === '' ? null : Number(s));
  const preview = compute_risk(
    { systolic: num(systolic), diastolic: num(diastolic), fasting_glucose: num(glucose) },
    rules,
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setBusy(true);
    setError(null);
    // Append-only insert; the server trigger sets the authoritative outcome.
    const { error } = await supabase.from('checkups').insert({
      id: crypto.randomUUID(),
      patient_id: patient.id,
      barangay_id: patient.barangay_id,
      checkup_date: todayManila(),
      systolic: num(systolic),
      diastolic: num(diastolic),
      fasting_glucose: num(glucose),
      notes: notes.trim() || null,
    } as never);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate(`/staff/patients/${patient.id}`);
  };

  return (
    <AppShell title={t('checkups.new.title')} nav={staffNav}>
      <form
        onSubmit={onSubmit}
        className="flex max-w-md flex-col gap-3 rounded-cl border border-border bg-surface p-5"
      >
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="sys" className="text-sm text-text-muted">
              {t('checkups.field.systolic')}
            </label>
            <input
              id="sys"
              type="number"
              inputMode="numeric"
              className="min-h-touch w-full rounded-cl border border-border bg-surface px-3"
              value={systolic}
              onChange={(e) => setSystolic(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="dia" className="text-sm text-text-muted">
              {t('checkups.field.diastolic')}
            </label>
            <input
              id="dia"
              type="number"
              inputMode="numeric"
              className="min-h-touch w-full rounded-cl border border-border bg-surface px-3"
              value={diastolic}
              onChange={(e) => setDiastolic(e.target.value)}
            />
          </div>
        </div>

        <label htmlFor="glu" className="text-sm text-text-muted">
          {t('checkups.field.fasting_glucose')}
        </label>
        <input
          id="glu"
          type="number"
          inputMode="decimal"
          className="min-h-touch rounded-cl border border-border bg-surface px-3"
          value={glucose}
          onChange={(e) => setGlucose(e.target.value)}
        />

        <label htmlFor="notes" className="text-sm text-text-muted">
          {t('checkups.field.notes')}
        </label>
        <textarea
          id="notes"
          className="rounded-cl border border-border bg-surface px-3 py-2"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center gap-2 rounded-cl bg-bg p-3">
          <span className="text-sm text-text-muted">{t('checkups.preview')}:</span>
          <RiskChip outcome={preview} />
        </div>
        <p className="text-xs text-text-muted">{t('checkups.preview_note')}</p>

        {error && (
          <p role="alert" className="text-sm text-needs-referral-red">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !patient}
          className="mt-1 min-h-touch rounded-cl bg-primary px-4 font-semibold text-white disabled:opacity-50"
        >
          {busy ? t('common.saving') : t('checkups.new.submit')}
        </button>
      </form>
    </AppShell>
  );
}
