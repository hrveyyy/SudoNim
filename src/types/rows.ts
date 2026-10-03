/**
 * Friendly row-type aliases over the Supabase-generated types.
 *
 * The generated `src/types/database.ts` is never hand-edited. This module just
 * re-exports table Row types under the snake_case names the app already uses,
 * so a type rename in the DB flows through here automatically.
 */
import type { Tables } from '@/types/database';

export type households_row = Tables<'households'>;
export type patients_row = Tables<'patients'>;
export type checkups_row = Tables<'checkups'>;
export type referrals_row = Tables<'referrals'>;
export type risk_rules_row = Tables<'risk_rules'>;
export type profiles_row = Tables<'profiles'>;
export type prescriptions_row = Tables<'prescriptions'>;
export type prescription_items_row = Tables<'prescription_items'>;
export type patient_notes_row = Tables<'patient_notes'>;
export type access_grants_row = Tables<'access_grants'>;
export type consents_row = Tables<'consents'>;
export type reminders_row = Tables<'reminders'>;
export type id_cards_row = Tables<'id_cards'>;
export type id_card_prints_row = Tables<'id_card_prints'>;
export type audit_logs_row = Tables<'audit_logs'>;
export type doctor_applications_row = Tables<'doctor_applications'>;
export type claim_codes_row = Tables<'claim_codes'>;
export type pairing_attempts_row = Tables<'pairing_attempts'>;
export type barangays_row = Tables<'barangays'>;
export type puroks_row = Tables<'puroks'>;
export type facilities_row = Tables<'facilities'>;
