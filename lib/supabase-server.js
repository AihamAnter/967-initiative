import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {createTimedFetch} from './requestSecurity';

export function serverDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {persistSession: false, autoRefreshToken: false},
    global: {fetch: createTimedFetch(10000)},
  });
}
