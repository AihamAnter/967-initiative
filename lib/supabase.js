import { createClient } from '@supabase/supabase-js';
import {createTimedFetch} from './requestSecurity';
let browserClient;
export function browserDb(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key) return null;
  if (!browserClient) browserClient=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},global:{fetch:createTimedFetch(60000)}});
  return browserClient;
}
export function publicDb(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key) return null;
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:createTimedFetch(10000)}});
}
