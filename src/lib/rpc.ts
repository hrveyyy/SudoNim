import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/**
 * Calls a database function that may not be in the generated types yet (it
 * was added in a newer migration than src/types/database.ts). The typed
 * `supabase.rpc` only accepts function names that exist in those types, so
 * this narrow wrapper keeps the build working until the types are
 * regenerated. Prefer `supabase.rpc` once the function is in the types.
 */
type UntypedRpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: PostgrestError | null }>;
};

export async function callRpc<T>(
  fn: string,
  args?: Record<string, unknown>,
): Promise<{ data: T | null; error: PostgrestError | null }> {
  // Called as a method on the client so `this` stays bound.
  const client = supabase as unknown as UntypedRpcClient;
  const { data, error } = await client.rpc(fn, args);
  return { data: (data ?? null) as T | null, error };
}
