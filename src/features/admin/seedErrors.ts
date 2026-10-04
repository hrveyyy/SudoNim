/** Error codes returned by the seed-bhw Edge Function. */
const KNOWN_ERRORS = [
  'unauthorized',
  'forbidden',
  'invalid_email',
  'invalid_barangay',
  'email_exists',
  'rate_limited',
] as const;

/** Map a seed-bhw error code to an i18n key (unknown codes -> generic). */
export function seedErrorKey(code: unknown): string {
  return typeof code === 'string' && (KNOWN_ERRORS as readonly string[]).includes(code)
    ? `admin.seed.errors.${code}`
    : 'admin.seed.errors.failed';
}
