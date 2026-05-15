import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import { config } from './env';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    if (!config.supabase.url || !config.supabase.anonKey) {
      throw new Error('Supabase configuration missing. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
    }
    supabaseInstance = createClient(config.supabase.url, config.supabase.anonKey, {
      global: { fetch: fetch },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      realtime: { transport: ws as any },
    });
  }
  return supabaseInstance;
}

export default getSupabase;
