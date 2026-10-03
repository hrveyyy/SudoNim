/**
 * Friendly row-type aliases over the Supabase-generated types.
 *
 * The generated `src/types/database.ts` is never hand-edited. This module just
 * re-exports table Row types under the snake_case names the app already uses,
 * so a type rename in the DB flows through here automatically.
 *
 * Only tables present in the applied migrations are aliased here. Add the
 * feature tables (prescriptions, access_grants, audit_logs, ...) once their
 * migrations land and types are regenerated.
 */
import type { Tables } from '@/types/database';

export type households_row = Tables<'households'>;
export type patients_row = Tables<'patients'>;
export type checkups_row = Tables<'checkups'>;
export type referrals_row = Tables<'referrals'>;
export type risk_rules_row = Tables<'risk_rules'>;
export type profiles_row = Tables<'profiles'>;
export type barangays_row = Tables<'barangays'>;
export type puroks_row = Tables<'puroks'>;
export type facilities_row = Tables<'facilities'>;
