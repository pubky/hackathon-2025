import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

let supabaseInstance: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export function getSupabase(): SupabaseClient {
  return supabaseInstance;
}

export function updateSupabaseHeaders(recipientPubky: string | null) {
  const headers: Record<string, string> = {};

  if (recipientPubky) {
    headers['x-recipient-pubky'] = recipientPubky;
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers
    }
  });
}

export const supabase = getSupabase();
