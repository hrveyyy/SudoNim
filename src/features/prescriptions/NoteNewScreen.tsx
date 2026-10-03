import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { doctorNav } from '@/features/scan/doctorNav';

/**
 * Doctor's per-visit note, split: patient_instructions (patient/BHW/doctor) and
 * clinical_note (doctor + patient only). Append-only insert; RLS requires an
 * active grant + physician_id = self.
 */
export default function NoteNewScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [instructions, setInstructions] = useState('');
  const [clinical, setClinical] = useState('');
  const [hasFollowUp, setHasFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.from('patient_notes').insert({
      id: crypto.randomUUID(),
      patient_id: id!,
      physician_id: session?.user?.id ?? null,
      patient_instructions: instructions.trim() || null,
      clinical_note: clinical.trim() || null,
      has_follow_up: hasFollowUp,
      follow_up_date: hasFollowUp && followUpDate ? followUpDate : null,
    } as never);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate(`/doctor/patients/${id}`);
  };

  return (
    <AppShell title={t('notes.new.title')} nav={doctorNav}>
      <form
        onSubmit={onSubmit}
        className="flex max-w-xl flex-col gap-3 rounded-cl border border-border bg-surface p-5"
      >
        <label htmlFor="instr" className="text-sm text-text-muted">
          {t('notes.patient_instructions')}
        </label>
        <textarea
          id="instr"
          rows={3}
          className="rounded-cl border border-border bg-surface px-3 py-2"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />

        <label htmlFor="clinical" className="text-sm text-text-muted">
          {t('notes.clinical_note')}
        </label>
        <textarea
          id="clinical"
          rows={3}
          className="rounded-cl border border-border bg-surface px-3 py-2"
          value={clinical}
          onChange={(e) => setClinical(e.target.value)}
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasFollowUp}
            onChange={(e) => setHasFollowUp(e.target.checked)}
          />
          {t('notes.follow_up')}
        </label>
        {hasFollowUp && (
          <input
            type="date"
            aria-label={t('notes.follow_up_date')}
            className="min-h-touch rounded-cl border border-border bg-surface px-3"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
        )}

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
          {busy ? t('common.saving') : t('notes.new.submit')}
        </button>
      </form>
    </AppShell>
  );
}
