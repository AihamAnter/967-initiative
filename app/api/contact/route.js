import {serverDb} from '@/lib/supabase-server';
import {handleContactRequest} from '@/lib/contactService';
export const runtime='nodejs';
export const POST=request=>handleContactRequest(request,{createDb:serverDb});