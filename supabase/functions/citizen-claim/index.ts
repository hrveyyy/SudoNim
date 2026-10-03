// citizen-claim: a signed-in citizen redeems a one-time claim code to link
// their account to the BHW-created patient row. The code is checked against the
// stored hash. Locks after 5 failed attempts (security rule 7). Rate-limited.
//
// Request:  POST { code: "XXXX-XXXX" }
// Response: { patient_id }   on success

import { handlePreflight, json } from '../_shared/cors.ts';
import { requireUser, serviceClient } from '../_shared/auth.ts';
import { rateLimit, clientKey } from '../_shared/rateLimit.ts';

const encoder = new TextEncoder();

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  if (!rateLimit(clientKey(req, 'citizen-claim'), 10, 60_000)) {
    return json({ error: 'rate limited' }, 429);
  }

  try {
    const user = await requireUser(req);
    const { code } = await req.json();
    if (typeof code !== 'string' || !code.trim()) {
      return json({ error: 'code required' }, 400);
    }

    const codeHash = await sha256Hex(code.trim().toUpperCase());
    const svc = serviceClient();

    const { data: row, error } = await svc
      .from('claim_codes')
      .select('id, patient_id, expires_at, consumed_at, failed_attempts, locked')
      .eq('code_hash', codeHash)
      .maybeSingle();

    if (error) return json({ error: 'lookup failed' }, 500);

    // No row matched the hash: do not reveal which part failed.
    if (!row) return json({ error: 'invalid or expired code' }, 400);

    if (row.locked) return json({ error: 'code locked' }, 423);
    if (row.consumed_at) return json({ error: 'code already used' }, 409);
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json({ error: 'invalid or expired code' }, 400);
    }

    // Link the patient row to this citizen and mark verified + consumed.
    const { error: upErr } = await svc
      .from('patients')
      .update({ user_id: user.id, verification_status: 'verified' })
      .eq('id', row.patient_id);
    if (upErr) return json({ error: upErr.message }, 500);

    await svc.from('claim_codes').update({ consumed_at: new Date().toISOString() }).eq('id', row.id);

    return json({ patient_id: row.patient_id });
  } catch (e) {
    return json({ error: String(e) }, 401);
  }
});
