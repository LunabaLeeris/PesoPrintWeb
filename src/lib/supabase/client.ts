import { createBrowserClient } from '@supabase/ssr';
import { getRequiredEnv } from '@/lib/env';

export function createClient() {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
