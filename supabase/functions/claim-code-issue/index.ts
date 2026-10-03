// claim-code-issue: a BHW issues a one-time claim code for a patient they
// created. The code is stored HASHED (sha256); the plain code is returned ONCE
// here and never again. Valid 7 days.
//
// Request:  POST { patient_id: string }
// Response: { code: "XXXX-XXXX", expires_at }   (plain code shown once)

import { handlePreflight, json } from '../_shared/cors.ts';
import { requireUser, userClient, serviceClient } from '../_shared/auth.ts';

const encoder = new TextEncoder();

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Human-friendly 8-char code, grouped as XXXX-XXXX (no ambiguous chars). */
function generateCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    await requireUser(req);
    const { patient_id } = await req.json();
    if (!patient_id) return json({ error: 'patient_id required' }, 400);

    // Verify the caller is barangay_staff of this patient's barangay via RLS:
    // if they can read the patient row, they are scoped to it.
    const client = userClient(req);
    const { data: patient, error: readErr } = await client
      .from('patients')
      .select('id')
      .eq('id', patient_id)
      .maybeSingle();
    if (readErr || !patient) return json({ error: 'not authorized' }, 403);

    const code = generateCode();
    const codeHash = await sha256Hex(code);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Insert the hashed code with the service client (claim_codes is RPC/server
    // only; no client write policy exists).
    const svc = serviceClient();
    const { error: insErr } = await svc.from('claim_codes').insert({
      patient_id,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
    if (insErr) return json({ error: insErr.message }, 500);

    // Return the PLAIN code once.
    return json({ code, expires_at: expiresAt });
  } catch (e) {
    return json({ error: String(e) }, 401);
  }
});
