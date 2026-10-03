// resolve-qr: verifies a scanned QR payload and returns the patient_code so the
// physician can proceed to the pairing-key challenge. Returns NO personal data
// and does NOT grant access — a valid signature only proves the QR is genuine.
//
// Rate-limited (security rule 7). Signature compared in constant time.
//
// Request:  POST { payload: "CL1.<code>.<ver>.<sig>" }
// Response: { patient_code, qr_version }  (on valid signature + current version)

import { handlePreflight, json } from '../_shared/cors.ts';
import { requireUser, serviceClient } from '../_shared/auth.ts';
import { verifyQr } from '../_shared/hmac.ts';
import { rateLimit, clientKey } from '../_shared/rateLimit.ts';

const QR_HMAC_SECRET = Deno.env.get('QR_HMAC_SECRET')!;

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  // Rate limit: 20 resolves/min per client.
  if (!rateLimit(clientKey(req, 'resolve-qr'), 20, 60_000)) {
    return json({ error: 'rate limited' }, 429);
  }

  try {
    await requireUser(req); // must be signed in (physician)
    const { payload } = await req.json();
    if (typeof payload !== 'string') return json({ error: 'payload required' }, 400);

    const parts = payload.trim().split('.');
    if (parts.length !== 4 || parts[0] !== 'CL1') {
      return json({ error: 'invalid payload' }, 400);
    }
    const patientCode = parts[1];
    const qrVersion = Number(parts[2]);
    const sig = parts[3];
    if (!Number.isInteger(qrVersion)) return json({ error: 'invalid payload' }, 400);

    const ok = await verifyQr(QR_HMAC_SECRET, patientCode, qrVersion, sig);
    if (!ok) return json({ error: 'bad signature' }, 400);

    // Confirm the code exists and the qr_version is still current (not reset).
    const svc = serviceClient();
    const { data, error } = await svc
      .from('patients')
      .select('patient_code, qr_version')
      .eq('patient_code', patientCode)
      .maybeSingle();

    if (error) return json({ error: 'lookup failed' }, 500);
    if (!data) return json({ error: 'unknown code' }, 404);
    if (data.qr_version !== qrVersion) {
      return json({ error: 'qr superseded' }, 409);
    }

    return json({ patient_code: data.patient_code, qr_version: data.qr_version });
  } catch (e) {
    return json({ error: String(e) }, 401);
  }
});
