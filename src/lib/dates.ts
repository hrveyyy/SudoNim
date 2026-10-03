import { formatInTimeZone } from 'date-fns-tz';

/** App time zone. Mirrors `today_manila()` on the server. */
export const APP_TIME_ZONE = 'Asia/Manila';

/** Today's date in Manila as `yyyy-MM-dd` (for `<input type="date">` bounds). */
export function today_manila_iso(now: Date = new Date()): string {
  return formatInTimeZone(now, APP_TIME_ZONE, 'yyyy-MM-dd');
}
