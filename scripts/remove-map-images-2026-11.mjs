// Removes location-map images (not photographs) that Wikidata listed as district images.
import {createClient} from '@supabase/supabase-js';
import {DISTRICT_PROFILE_PREFIX, validateDistrictProfile} from '../lib/districtProfiles.js';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth: {persistSession: false}});
const {data: users} = await db.auth.admin.listUsers({perPage: 1000});
const actor = users.users.find(user => user.email === process.env.SITE_ADMIN_EMAIL)?.id;
for (const id of ['YE1707', 'YE1709', 'YE1201']) {
  const key = DISTRICT_PROFILE_PREFIX + id;
  const {data: current} = await db.from('site_settings').select('value,updated_at').eq('key', key).single();
  const profile = validateDistrictProfile({...current.value.profile, image_url: '', image_credit: '', image_source_url: ''});
  const {error} = await db.rpc('editorial_service_save', {p_kind: 'setting', p_id: key, p_revision: current.updated_at, p_data: {version: 1, profile}, p_actor: actor, p_action: 'update'});
  console.log(id, error ? error.message : 'map image removed');
}
