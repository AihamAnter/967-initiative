-- Speaker accounts are optional; existing manual speakers remain untouched.
ALTER TABLE public.debate_speakers ADD COLUMN IF NOT EXISTS member_user_id uuid REFERENCES public.public_profiles(user_id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS debate_speakers_member_user_id_unique ON public.debate_speakers(member_user_id) WHERE member_user_id IS NOT NULL;
COMMENT ON COLUMN public.debate_speakers.member_user_id IS 'Optional account association set only through the guarded debate editor RPC.';

CREATE OR REPLACE FUNCTION public.debate_admin_mutate(p_action text, p_id uuid DEFAULT NULL::uuid, p_revision bigint DEFAULT NULL::bigint, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare before_children jsonb; after_children jsonb; result jsonb; parent jsonb; fields text[]; linked_member uuid;
begin
 -- Deny unverified or suspended accounts before locking or reading debate rows.
 if public.debate_role() is null then
  raise exception 'Editor required' using errcode='42501';
 end if;
 if p_action='save' then
  -- Original RPC remains the authority for capability, revision and validation.
  if p_id is not null then perform 1 from public.debates where id=p_id for update;end if;
  before_children:=public.editorial_debate_children(p_id);
  perform set_config('app967.editorial_debate_batch','true',true);
 end if;
 result:=public.editorial_debate_mutate_legacy(p_action,p_id,p_revision,p_data);

 if p_action='speaker' and p_data ? 'member_user_id' then
  linked_member:=null;
  if p_data->>'member_user_id' is not null then
   if (p_data->>'member_user_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Invalid linked member ID' using errcode='22023';
   end if;
   linked_member:=(p_data->>'member_user_id')::uuid;
   if not exists (
    select 1 from public.public_profiles p
    join auth.users u on u.id=p.user_id
    left join public.private_messaging_settings prefs on prefs.user_id=p.user_id
    where p.user_id=linked_member
      and nullif(btrim(p.display_name),'') is not null
      and not p.suspended and p.deletion_requested_at is null
      and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until<=clock_timestamp())
      and coalesce(prefs.discoverable,true)
   ) then
    raise exception 'Linked member unavailable or hidden' using errcode='22023';
   end if;
  end if;
  update public.debate_speakers
     set member_user_id=linked_member, updated_at=clock_timestamp()
     where id=(result->>'id')::uuid;
 end if;

 if p_action='save' then
  perform set_config('app967.editorial_debate_batch','false',true);
  after_children:=public.editorial_debate_children((result->>'id')::uuid);
  select array_agg(k order by k) into fields from jsonb_object_keys(after_children) k where before_children->k is distinct from after_children->k;
  if cardinality(fields)>0 then
   select to_jsonb(d) into parent from public.debates d where id=(result->>'id')::uuid;
   perform public.editorial_emit('debate','debates',parent->>'id',parent,parent,'/debates/'||(parent->>'slug'),fields);
  end if;
 end if;
 return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.debate_speaker_public(p_slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select jsonb_build_object('speaker',to_jsonb(s) || jsonb_build_object('member_user_id',(select p.user_id from public.public_profiles p
  join auth.users u on u.id=p.user_id
  left join public.private_messaging_settings prefs on prefs.user_id=p.user_id
  where p.user_id=s.member_user_id
    and not p.suspended and p.deletion_requested_at is null
    and u.email_confirmed_at is not null
    and (u.banned_until is null or u.banned_until<=clock_timestamp())
    and coalesce(prefs.discoverable,true))),'debates',coalesce((select jsonb_agg(public.debate_public_record(d) order by d.created_at desc) from public.debates d join public.debate_participants p on p.debate_id=d.id where p.speaker_id=s.id and d.publication_status in ('published','archived')),'[]'::jsonb)) from public.debate_speakers s where s.slug=p_slug and is_published
$function$
;

CREATE OR REPLACE FUNCTION public.debate_public_record(p_debate debates)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select (to_jsonb(p_debate)-array['created_by','revision','results','recording_url','summary','results_published','duration_seconds']) || jsonb_build_object(
 'recording_url',case when p_debate.recording_published then p_debate.recording_url end,
 'duration_seconds',case when p_debate.recording_published then p_debate.duration_seconds end,
 'summary',case when p_debate.summary_published then p_debate.summary else '{}'::jsonb end,
 'participants',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'stance',p.stance,'role_label',p.role_label,'speaker',(to_jsonb(s)-'created_at'-'updated_at') || jsonb_build_object('member_user_id',(select p.user_id from public.public_profiles p
  join auth.users u on u.id=p.user_id
  left join public.private_messaging_settings prefs on prefs.user_id=p.user_id
  where p.user_id=s.member_user_id
    and not p.suspended and p.deletion_requested_at is null
    and u.email_confirmed_at is not null
    and (u.banned_until is null or u.banned_until<=clock_timestamp())
    and coalesce(prefs.discoverable,true)))) order by p.position,p.id) from public.debate_participants p join public.debate_speakers s on s.id=p.speaker_id and s.is_published where p.debate_id=p_debate.id),'[]'::jsonb))
$function$
;
