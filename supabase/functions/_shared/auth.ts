// Auth helpers for Edge Functions.
//
// - serviceClient(): a Supabase client using the service role key (bypasses
//   RLS). Use ONLY for narrowly-scoped server operations and never return more
//   data than the caller is entitled to.
// - userClient(req): a client bound to the caller's JWT (respects RLS).
// - requireUser(req): resolves the authenticated user or throws.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function userClient(req: Request): SupabaseClient {
  const authorization = req.headers.get('Authorization') ?? '';
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUser(req: Request): Promise<{ id: string; email?: string }> {
  // Pass the caller's JWT explicitly. The client has no stored session here,
  // so getUser() must be given the token from the Authorization header.
  const authorization = req.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('unauthorized');
  const client = userClient(req);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error('unauthorized');
  return { id: data.user.id, email: data.user.email ?? undefined };
}
