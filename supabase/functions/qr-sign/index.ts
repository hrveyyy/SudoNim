// qr-sign: returns a signed QR payload for a patient's current qr_version.
//
// Caller must be authenticated barangay_staff of the patient's barangay (RLS
// on the user-scoped read enforces the barangay scope). The HMAC secret stays
// server-side. The payload contains NO personal data.
//
// Request:  POST { patient_id: string }
// Response: { payload: "CL1.<code>.<ver>.<sig>", patient_code, qr_version }

import { handlePreflight, json } from '../_shared/cors.ts';
import { userClient, requireUser } from '../_shared/auth.ts';
import { buildPayload } from '../_shared/hmac.ts';

const QR_HMAC_SECRET = Deno.env.get('QR_HMAC_SECRET')!;

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    await requireUser(req);
    const { patient_id } = await req.json();
    if (!patient_id) return json({ error: 'patient_id required' }, 400);

    // Read via the caller's client so RLS enforces barangay scope.
    const client = userClient(req);
    const { data, error } = await client
      .from('patients')
      .select('patient_code, qr_version')
      .eq('id', patient_id)
      .maybeSingle();

    if (error) return json({ error: error.message }, 403);
    if (!data || !data.patient_code) {
      return json({ error: 'patient not found or code pending' }, 404);
    }

    const payload = await buildPayload(QR_HMAC_SECRET, data.patient_code, data.qr_version);
    return json({ payload, patient_code: data.patient_code, qr_version: data.qr_version });
  } catch (e) {
    return json({ error: String(e) }, 401);
  }
});
