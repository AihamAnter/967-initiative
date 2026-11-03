-- Applied in Supabase on 2026-11-03 as migration 20261103001023.
-- SECURITY DEFINER + direct authenticated EXECUTE remains necessary for the
-- editor API. Check the confirmed and non-banned editor role BEFORE obtaining
-- row locks or reading child debate records. All previous grants stay intact.
CREATE OR REPLACE FUNCTION public.debate_admin_mutate(p_action text, p_id uuid DEFAULT NULL::uuid, p_revision bigint DEFAULT NULL::bigint, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare before_children jsonb; after_children jsonb; result jsonb; parent jsonb; fields text[];
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
$function$;
