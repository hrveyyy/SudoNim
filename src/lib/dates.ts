import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/** CareLink operates in Philippine time. Mirrors `today_manila()` on the server. */
export const MANILA_TZ = 'Asia/Manila';

/** Alias of MANILA_TZ (name used by the auth screens). */
export const APP_TIME_ZONE = MANILA_TZ;

/** Format an ISO timestamp in Asia/Manila. */
export function formatManila(iso: string, pattern = 'yyyy-MM-dd HH:mm'): string {
  return formatInTimeZone(parseISO(iso), MANILA_TZ, pattern);
}

/** Format a date-only string (yyyy-MM-dd) for display. */
export function formatDate(dateStr: string, pattern = 'MMM d, yyyy'): string {
  // Date-only values have no timezone; parse as local midnight and format.
  return format(parseISO(dateStr), pattern);
}

/** Today's date in Manila as `yyyy-MM-dd` (for `<input type="date">` bounds). */
export function today_manila_iso(now: Date = new Date()): string {
  return formatInTimeZone(now, MANILA_TZ, 'yyyy-MM-dd');
}

/** Today's date in Asia/Manila as yyyy-MM-dd (client-side convenience). */
export function todayManila(): string {
  return today_manila_iso();
}

/** Compact birthdate as YYYYMMDD (used only inside the pairing-key input). */
export function toYyyymmdd(dateStr: string): string {
  return format(parseISO(dateStr), 'yyyyMMdd');
}

/** Age in whole years from a birthdate (yyyy-MM-dd), computed in Manila. */
export function ageFromBirthdate(birthdate: string): number {
  const today = parseISO(todayManila());
  const birth = parseISO(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}
