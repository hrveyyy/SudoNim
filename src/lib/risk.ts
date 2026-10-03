/**
 * Client-side risk preview. MUST mirror the server `compute_risk` function
 * (supabase/migrations/0004_functions.sql) exactly. The server is always
 * authoritative; this is only a live preview in the check-up form.
 *
 * Thresholds are PLACEHOLDERS stored in the `risk_rules` table and need
 * licensed-physician approval before real use. They are never hard-coded in UI
 * text or elsewhere — only here (the client mirror) and in risk_rules.
 *
 * Outcomes are screening tags, NEVER a diagnosis: 'normal' | 'monitor' |
 * 'needs_referral'.
 */

export type screening_outcome = 'normal' | 'monitor' | 'needs_referral';

/** Mirrors the columns of a `risk_rules` row that affect the outcome. */
export interface risk_rules {
  bp_systolic_cutoff: number;
  bp_diastolic_cutoff: number;
  bp_monitor_systolic: number;
  bp_monitor_diastolic: number;
  fasting_glucose_cutoff: number;
  fasting_glucose_monitor: number;
  family_history_min_age: number;
}

/** Defaults matching the active seeded risk_rules row (version 1). */
export const DEFAULT_RISK_RULES: risk_rules = {
  bp_systolic_cutoff: 140,
  bp_diastolic_cutoff: 90,
  bp_monitor_systolic: 130,
  bp_monitor_diastolic: 85,
  fasting_glucose_cutoff: 126.0,
  fasting_glucose_monitor: 110.0,
  family_history_min_age: 40,
};

export interface vitals {
  systolic?: number | null;
  diastolic?: number | null;
  fasting_glucose?: number | null;
}

/**
 * Compute the screening outcome. Identical logic to the server:
 *  - needs_referral if any reading is at/above its referral cutoff
 *  - monitor if any reading is at/above its monitor threshold (but not referral)
 *  - normal otherwise
 */
export function compute_risk(v: vitals, rules: risk_rules = DEFAULT_RISK_RULES): screening_outcome {
  const { systolic, diastolic, fasting_glucose } = v;

  const needs_referral =
    (systolic != null && systolic >= rules.bp_systolic_cutoff) ||
    (diastolic != null && diastolic >= rules.bp_diastolic_cutoff) ||
    (fasting_glucose != null && fasting_glucose >= rules.fasting_glucose_cutoff);

  const monitor =
    (systolic != null && systolic >= rules.bp_monitor_systolic) ||
    (diastolic != null && diastolic >= rules.bp_monitor_diastolic) ||
    (fasting_glucose != null && fasting_glucose >= rules.fasting_glucose_monitor);

  if (needs_referral) return 'needs_referral';
  if (monitor) return 'monitor';
  return 'normal';
}
