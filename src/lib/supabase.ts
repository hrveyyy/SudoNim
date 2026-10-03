import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * The single place in the app that creates the Supabase client.
 * No other module may call `createClient`.
 */

const supabase_url = import.meta.env.VITE_SUPABASE_URL;
const supabase_anon_key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabase_url || !supabase_anon_key) {
  // Fail loud in dev; the data layer cannot sync without these.
  // We intentionally do not log the key value itself.
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Sync will be disabled until they are configured.',
  );
}

export const supabase = createClient<Database>(
  supabase_url ?? 'http://localhost:54321',
  supabase_anon_key ?? 'public-anon-key-not-set',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
