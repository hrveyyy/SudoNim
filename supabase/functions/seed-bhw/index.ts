// seed-bhw: an admin creates a barangay staff (BHW) account in one step.
//
// The function creates the Supabase Auth user (so the user id is generated
// server-side), then calls the seed_bhw RPC *as the admin* (caller JWT) so the
// role check and the `bhw_seeded` audit entry stay in the database. If the RPC
// fails, the freshly created auth user is deleted again.
//
// A temporary password is generated here and returned ONCE; it is never stored
// or logged. The admin hands it to the BHW out of band.
//
// Request:  POST { email: string, barangay_id: uuid, full_name?: string }
// Response: { user_id, email, temporary_password }
// Errors:   { error: 'unauthorized' | 'forbidden' | 'invalid_email'
//                  | 'invalid_barangay' | 'email_exists' | 'rate_limited'
//                  | 'failed' }

import { handlePreflight, json } from '../_shared/cors.ts';
import { requireUser, serviceClient, userClient } from '../_shared/auth.ts';
import { clientKey, rateLimit } from '../_shared/rateLimit.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 16-char temporary password without ambiguous characters. */
function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  // Rejection sampling avoids modulo bias.
  const out: string[] = [];
  while (out.length < 16) {
    const [b] = crypto.getRandomValues(new Uint8Array(1));
    if (b < 256 - (256 % alphabet.length)) out.push(alphabet[b % alphabet.length]);
  }
  return out.join('');
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'failed' }, 405);

  let caller: { id: string };
  try {
    caller = await requireUser(req);
  } catch {
    return json({ error: 'unauthorized' }, 401);
  }

  if (!rateLimit(clientKey(req, `seed-bhw:${caller.id}`), 20, 60_000)) {
    return json({ error: 'rate_limited' }, 429);
  }

  const svc = serviceClient();

  // Check the caller is an admin BEFORE creating anything. seed_bhw repeats
  // this check in the database; this one just prevents orphan auth users.
  const { data: profile } = await svc
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle();
  if (profile?.role !== 'admin') return json({ error: 'forbidden' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'failed' }, 400);
  }
  const email = String(body.email ?? '').trim().toLowerCase();
  const barangay_id = String(body.barangay_id ?? '').trim();
  const full_name = String(body.full_name ?? '').trim() || null;

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: 'invalid_email' }, 400);
  }
  if (!UUID_RE.test(barangay_id)) return json({ error: 'invalid_barangay' }, 400);

  const { data: brgy } = await svc
    .from('barangays')
    .select('id')
    .eq('id', barangay_id)
    .maybeSingle();
  if (!brgy) return json({ error: 'invalid_barangay' }, 400);

  // Create the auth user. No `intended_role` metadata, so the citizen signup
  // trigger (handle_new_citizen) skips it.
  const temporary_password = generatePassword();
  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email,
    password: temporary_password,
    email_confirm: true,
    user_metadata: full_name ? { full_name } : {},
  });
  if (createErr || !created.user) {
    const exists =
      createErr?.code === 'email_exists' ||
      /already (been )?registered|already exists/i.test(createErr?.message ?? '');
    return json({ error: exists ? 'email_exists' : 'failed' }, exists ? 409 : 500);
  }
  const user_id = created.user.id;

  // Bind the new user to the barangay as the admin (audit actor = admin).
  const { error: rpcErr } = await userClient(req).rpc('seed_bhw', {
    p_user_id: user_id,
    p_barangay_id: barangay_id,
    p_full_name: full_name,
  });
  if (rpcErr) {
    await svc.auth.admin.deleteUser(user_id);
    return json({ error: 'failed' }, 500);
  }

  return json({ user_id, email, temporary_password });
});
