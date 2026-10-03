// Simple in-memory rate limiter for Edge Functions.
//
// Keyed by an arbitrary identifier (e.g. IP + action). This is best-effort and
// per-instance; durable rate limiting for sensitive flows (pairing key, claim
// codes) is additionally enforced in the database (pairing_attempts,
// claim_codes.failed_attempts). Use this as a cheap first line of defense.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Returns true if the request is allowed, false if the limit is exceeded.
 * @param key   unique bucket key
 * @param limit max requests per window
 * @param windowMs window length in ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/** Derive a client key from the request (best-effort IP). */
export function clientKey(req: Request, action: string): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    'unknown';
  return `${action}:${ip}`;
}
