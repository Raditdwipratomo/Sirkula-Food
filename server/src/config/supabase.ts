import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from './env.js';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!serverEnv.SUPABASE_URL || !serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server/.env'
    );
  }
  if (!adminClient) {
    adminClient = createClient(
      serverEnv.SUPABASE_URL,
      serverEnv.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return adminClient;
}

/**
 * Membuat Supabase client yang terikat pada JWT pengguna sehingga RLS tetap ditegakkan.
 */
export function getUserScopedSupabase(accessToken: string): SupabaseClient {
  if (!serverEnv.SUPABASE_URL) {
    throw new Error('SUPABASE_URL belum dikonfigurasi di server/.env');
  }
  const key =
    serverEnv.SUPABASE_PUBLISHABLE_KEY ?? serverEnv.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createClient(serverEnv.SUPABASE_URL, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
