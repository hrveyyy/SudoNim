// doctor-apply: a signed-in applicant submits their PRC ID + uploaded document
// paths, creating a `doctor_applications` row with status 'pending'. An admin
// later reviews via the approve_doctor RPC.
//
// The documents themselves are uploaded client-side to a PRIVATE Storage bucket
// (admin-only RLS); this function records the application and the storage paths.
//
// Request:  POST { prc_id, full_name?, facility_id?, document_paths?: string[] }
// Response: { application_id, status: "pending" }

import { handlePreflight, json } from '../_shared/cors.ts';
import { requireUser, serviceClient } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const user = await requireUser(req);
    const body = await req.json();
    const prc_id = (body.prc_id ?? '').trim();
    if (!prc_id) return json({ error: 'prc_id required' }, 400);

    const document_paths: string[] = Array.isArray(body.document_paths)
      ? body.document_paths.filter((p: unknown) => typeof p === 'string')
      : [];

    const svc = serviceClient();

    // Upsert on user_id (one application per user).
    const { data, error } = await svc
      .from('doctor_applications')
      .upsert(
        {
          user_id: user.id,
          prc_id,
          full_name: body.full_name ?? null,
          facility_id: body.facility_id ?? null,
          document_paths,
          status: 'pending',
        },
        { onConflict: 'user_id' },
      )
      .select('id')
      .single();

    if (error) return json({ error: error.message }, 500);
    return json({ application_id: data.id, status: 'pending' });
  } catch (e) {
    return json({ error: String(e) }, 401);
  }
});
