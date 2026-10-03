import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { doctorNav } from '@/features/scan/doctorNav';

interface ItemDraft {
  drug_name: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const emptyItem = (): ItemDraft => ({
  drug_name: '',
  strength: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
});

/**
 * Doctor issues an e-prescription via issue_prescription (immutable after
 * issue, up to 20 items, no diagnosis field, no controlled drugs). License is
 * required; we read it from the physician's user metadata if present.
 */
export default function PrescriptionNewScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [license, setLicense] = useState<string>(
    (session?.user?.user_metadata?.prc_id as string | undefined) ?? '',
  );
  const [followUp, setFollowUp] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setItem = (i: number, patch: Partial<ItemDraft>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const addItem = () => setItems((prev) => (prev.length >= 20 ? prev : [...prev, emptyItem()]));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payloadItems = items
      .filter((it) => it.drug_name.trim())
      .map((it) => ({
        drug_name: it.drug_name.trim(),
        strength: it.strength.trim() || null,
        dosage: it.dosage.trim() || null,
        frequency: it.frequency.trim() || null,
        duration: it.duration.trim() || null,
        instructions: it.instructions.trim() || null,
      }));
    const { data, error } = await supabase.rpc('issue_prescription', {
      p_patient_id: id!,
      p_license: license.trim(),
      p_items: payloadItems,
      p_follow_up_date: followUp || undefined,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate(`/doctor/prescriptions/${data}`);
  };

  return (
    <AppShell title={t('prescriptions.new.title')} nav={doctorNav}>
      <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-3">
        <div className="rounded-cl border border-border bg-surface p-4">
          <label htmlFor="license" className="text-sm text-text-muted">
            {t('prescriptions.license')}
          </label>
          <input
            id="license"
            className="min-h-touch w-full rounded-cl border border-border bg-surface px-3"
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            required
          />
          <label htmlFor="followup" className="mt-3 block text-sm text-text-muted">
            {t('prescriptions.new.follow_up')}
          </label>
          <input
            id="followup"
            type="date"
            className="min-h-touch rounded-cl border border-border bg-surface px-3"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
          />
        </div>

        {items.map((it, i) => (
          <fieldset key={i} className="rounded-cl border border-border bg-surface p-4">
            <legend className="px-1 text-sm text-text-muted">#{i + 1}</legend>
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="min-h-touch rounded-cl border border-border bg-surface px-3"
                placeholder={t('prescriptions.item.drug')}
                value={it.drug_name}
                onChange={(e) => setItem(i, { drug_name: e.target.value })}
              />
              <input
                className="min-h-touch rounded-cl border border-border bg-surface px-3"
                placeholder={t('prescriptions.item.strength')}
                value={it.strength}
                onChange={(e) => setItem(i, { strength: e.target.value })}
              />
              <input
                className="min-h-touch rounded-cl border border-border bg-surface px-3"
                placeholder={t('prescriptions.item.dosage')}
                value={it.dosage}
                onChange={(e) => setItem(i, { dosage: e.target.value })}
              />
              <input
                className="min-h-touch rounded-cl border border-border bg-surface px-3"
                placeholder={t('prescriptions.item.frequency')}
                value={it.frequency}
                onChange={(e) => setItem(i, { frequency: e.target.value })}
              />
              <input
                className="min-h-touch rounded-cl border border-border bg-surface px-3"
                placeholder={t('prescriptions.item.duration')}
                value={it.duration}
                onChange={(e) => setItem(i, { duration: e.target.value })}
              />
              <input
                className="min-h-touch rounded-cl border border-border bg-surface px-3"
                placeholder={t('prescriptions.item.instructions')}
                value={it.instructions}
                onChange={(e) => setItem(i, { instructions: e.target.value })}
              />
            </div>
          </fieldset>
        ))}

        {items.length < 20 && (
          <button
            type="button"
            onClick={addItem}
            className="min-h-touch self-start rounded-cl border border-border px-4"
          >
            {t('prescriptions.new.add_item')}
          </button>
        )}

        <p className="text-xs text-text-muted">{t('prescriptions.no_controlled')}</p>

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
          {busy ? t('common.saving') : t('prescriptions.new.submit')}
        </button>
      </form>
    </AppShell>
  );
}
