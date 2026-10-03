import type { screening_outcome } from '@/lib/risk';

/** A patient's full display name, "Surname, First". */
export function patientName(surname: string | null, firstName: string | null): string {
  const s = surname?.trim() ?? '';
  const f = firstName?.trim() ?? '';
  if (s && f) return `${s}, ${f}`;
  return s || f || '';
}

/** Patient code for display, or a "code pending" marker when unassigned. */
export function patientCodeOrPending(code: string | null, pendingLabel: string): string {
  return code ?? pendingLabel;
}

/** i18n key for a screening outcome label (never color-only; always a label). */
export function outcomeLabelKey(outcome: screening_outcome | null): string {
  switch (outcome) {
    case 'needs_referral':
      return 'checkups.outcome.needs_referral';
    case 'monitor':
      return 'checkups.outcome.monitor';
    case 'normal':
      return 'checkups.outcome.normal';
    default:
      return 'checkups.outcome.unknown';
  }
}

/** Blood pressure as "120/80" or an em dash when incomplete. */
export function formatBp(systolic: number | null, diastolic: number | null): string {
  if (systolic == null || diastolic == null) return '—';
  return `${systolic}/${diastolic}`;
}
