-- REVIEW ONLY. Run in an isolated database first. No historical backfill.
-- Requires content schemas, inline editor and task collaboration migrations.
begin;
create table public.editorial_audit_activation (singleton boolean primary key default true check(singleton), activated_at timestamptz not null default clock_timestamp());
insert into public.editorial_audit_activation(singleton) values(true);
create table public.editorial_contributions (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default clock_timestamp(),
 transaction_id bigint not null default txid_current(), actor_id uuid, actor_name text not null, actor_role text,
 action text not null check(action in ('create','update','publish','unpublish','delete','restore','correction')),
 content_type text not null, section text not null, content_id text not null,
 title text not null, slug text, path text, is_published boolean,
 changed_fields text[] not null default '{}', origin text not null,
 unique(transaction_id,content_type,content_id)
);
create index editorial_contributions_time on public.editorial_contributions(created_at desc,id);
create index editorial_contributions_member on public.editorial_contributions(actor_id,created_at desc);
create function public.editorial_can_read() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.editors e join auth.users u on u.id=e.user_id where e.user_id=auth.uid() and e.role in ('admin','management') and u.email_confirmed_at is not null and (nullif(to_jsonb(u)->>'banned_until','') is null or (to_jsonb(u)->>'banned_until')::timestamptz<=now()));
$$;
revoke all on function public.editorial_can_read() from public;
grant execute on function public.editorial_can_read() to authenticated;
alter table public.editorial_contributions enable row level security;
alter table public.editorial_audit_activation enable row level security;
revoke all on public.editorial_contributions,public.editorial_audit_activation from public,anon,authenticated,service_role;
grant select on public.editorial_contributions,public.editorial_audit_activation to authenticated;
create policy editorial_team_read on public.editorial_contributions for select to authenticated using(public.editorial_can_read());
create policy editorial_activation_read on public.editorial_audit_activation for select to authenticated using(public.editorial_can_read());

-- No raw values or credentials are retained. Only public content metadata and field names.
create function public.editorial_emit(p_type text,p_section text,p_id text,p_before jsonb,p_after jsonb,p_path text,p_fields text[] default null) returns void language plpgsql security definer set search_path='' as $$
declare a uuid; r text; n text; oldv jsonb:=coalesce(p_before,'{}'); newv jsonb:=coalesce(p_after,'{}'); item jsonb:=coalesce(p_after,p_before); fields text[]; act text; oldpub boolean; pub boolean; origin text;
begin
 if p_id is null then return; end if;
 oldv:=oldv-array['updated_at','created_at','updatedAt','revision','first_published_at']; newv:=newv-array['updated_at','created_at','updatedAt','revision','first_published_at'];
 if p_before is not null and p_after is not null and oldv=newv and coalesce(cardinality(p_fields),0)=0 then return; end if;
 select array_agg(k order by k) into fields from (select key k from jsonb_object_keys(oldv||newv) key where oldv->key is distinct from newv->key) s;
 fields:=array(select distinct f from unnest(coalesce(fields,'{}')||coalesce(p_fields,'{}')) f order by f);
 a:=auth.uid();
 if a is null then a:=nullif(current_setting('app967.editorial_actor',true),'')::uuid; end if;
 select e.role,coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'display_name',''),'عضو فريق') into r,n from public.editors e join auth.users u on u.id=e.user_id where e.user_id=a and e.role in ('admin','management');
 if r is null then a:=null; n:='النظام — دون إسناد لمحرر'; end if;
 origin:=coalesce(nullif(current_setting('app967.editorial_origin',true),''),case when a is null then 'database:system' else 'database:authenticated' end);
 oldpub:=case when oldv ? 'publication_status' then oldv->>'publication_status' in ('published','archived') else coalesce((oldv->>'is_published')::boolean,(oldv->>'isPublished')::boolean) end;
 pub:=case when newv ? 'publication_status' then newv->>'publication_status' in ('published','archived') else coalesce((newv->>'is_published')::boolean,(newv->>'isPublished')::boolean) end;
 act:=case when p_before is null then 'create' when p_after is null then 'delete' when oldpub is false and pub is true then 'publish' when oldpub is true and pub is false then 'unpublish' when current_setting('app967.editorial_intent',true)='correction' then 'correction' else 'update' end;
 insert into public.editorial_contributions(actor_id,actor_name,actor_role,action,content_type,section,content_id,title,slug,path,is_published,changed_fields,origin)
 values(a,n,r,act,p_type,p_section,p_id,left(coalesce(nullif(item->>'title',''),nullif(item->>'full_name',''),nullif(item->>'name',''),nullif(item->>'name_ar',''),p_id),300),item->>'slug',p_path,case when p_after is null then null else pub end,fields,origin)
 on conflict(transaction_id,content_type,content_id) do update set
 actor_id=coalesce(excluded.actor_id,editorial_contributions.actor_id),actor_name=case when excluded.actor_id is null then editorial_contributions.actor_name else excluded.actor_name end,actor_role=coalesce(excluded.actor_role,editorial_contributions.actor_role),
 action=case when excluded.action='delete' then 'delete' when editorial_contributions.action='create' then 'create' when excluded.action in ('publish','unpublish') then excluded.action else editorial_contributions.action end,
 title=excluded.title,slug=excluded.slug,path=excluded.path,is_published=excluded.is_published,
 changed_fields=array(select distinct f from unnest(editorial_contributions.changed_fields||excluded.changed_fields) f order by f);
end;
$$;
revoke all on function public.editorial_emit(text,text,text,jsonb,jsonb,text,text[]) from public,anon,authenticated,service_role;

create function public.editorial_content_trigger() returns trigger language plpgsql security definer set search_path='' as $$
declare b jsonb; a jsonb; item jsonb; kind text; sec text; route text; target text; oldpage jsonb; newpage jsonb; pageid text; parent jsonb; before_pages jsonb; extras text[]:='{}';
begin
 if TG_OP<>'INSERT' then b:=to_jsonb(old); end if; if TG_OP<>'DELETE' then a:=to_jsonb(new); end if; item:=coalesce(a,b); target:=item->>'id';
 case TG_TABLE_NAME
 when 'issues' then kind:='issue';sec:='magazine';route:='/magazine/'||(item->>'slug');
 when 'works' then kind:='work';sec:='works';route:=case when nullif(item->>'debate_slug','') is not null then '/debates/'||(item->>'debate_slug') else '/works/'||(item->>'slug') end;
 when 'yemeni_companies' then kind:='company';sec:='products';route:='/yemeni-products/'||(item->>'slug');
 when 'professionals' then kind:='professional';sec:='professionals';route:='/professionals/'||(item->>'slug');
 when 'yemeni_figures' then kind:='figure';sec:='figures';route:='/yemen-map/figures/'||(item->>'slug'); if current_setting('app967.editorial_profile_changed',true)='true' then extras:=array['profile']; end if;
 when 'governorates','districts' then kind:=case TG_TABLE_NAME when 'governorates' then 'governorate' else 'district' end;sec:='atlas';route:='/yemen-map?'||case kind when 'district' then 'district=' else 'region=' end||target;
 when 'debates' then kind:='debate';sec:='debates';route:='/debates/'||(item->>'slug');
 when 'debate_speakers' then kind:='speaker';sec:='debates';route:='/debates/speakers/'||(item->>'slug');
 when 'debate_participants','debate_polls','debate_poll_options','debate_video_chapters' then
  if current_setting('app967.editorial_debate_batch',true)='true' then return coalesce(new,old);end if;
  select to_jsonb(d) into parent from public.debates d where d.id=(item->>'debate_id')::uuid;
  if parent is null then return coalesce(new,old); end if;
  if b is not distinct from a then return coalesce(new,old); end if;
  perform public.editorial_emit('debate','debates',parent->>'id',parent,parent,'/debates/'||(parent->>'slug'),array[TG_TABLE_NAME]);return coalesce(new,old);
 when 'stat_sections','stat_domains','stat_sources' then kind:=case TG_TABLE_NAME when 'stat_sections' then 'statistic_section' when 'stat_domains' then 'statistic_domain' else 'statistic_source' end;sec:='statistics';route:='/yemen-in-numbers'||case when TG_TABLE_NAME='stat_domains' then '/'||(item->>'slug') else '' end;
 when 'stat_indicators' then kind:='statistic';sec:='statistics';route:='/yemen-in-numbers/indicator/'||(item->>'slug');
 when 'stat_values' then
  select to_jsonb(i) into parent from public.stat_indicators i where i.id=(item->>'indicator_id')::uuid;
  if parent is null then
   if TG_OP='DELETE' then
    select jsonb_build_object('title',c.title) into parent from public.editorial_contributions c where content_type='statistic_value' and content_id=target order by created_at desc,id desc limit 1;
    b:=b||jsonb_build_object('title',coalesce(parent->>'title','قيمة إحصائية — '||(item->>'year')));
    perform public.editorial_emit('statistic_value','statistics',target,b,null,null);
   end if;
   return coalesce(new,old);
  end if;
  kind:='statistic_value';sec:='statistics';route:='/yemen-in-numbers/indicator/'||(parent->>'slug');
  if a is not null then a:=a||jsonb_build_object('title',(parent->>'name')||' — '||(item->>'year')); end if;
  if b is not null then b:=b||jsonb_build_object('title',(parent->>'name')||' — '||(item->>'year')); end if;
 when 'stat_indicator_sources' then
  select to_jsonb(i) into parent from public.stat_indicators i where i.id=(item->>'indicator_id')::uuid;
  if parent is null or b is not distinct from a then return coalesce(new,old); end if;
  perform public.editorial_emit('statistic','statistics',parent->>'id',parent,parent,'/yemen-in-numbers/indicator/'||(parent->>'slug'),array['sources']);return coalesce(new,old);
 when 'ranking_indicators','ranking_snapshots' then
  kind:='ranking';sec:='rankings';route:='/yemen-ranking?indicator='||(item->>'slug');
  if TG_TABLE_NAME='ranking_snapshots' then
   select to_jsonb(i) into parent from public.ranking_indicators i where i.id=(item->>'indicator_id')::uuid;
   if parent is null or (b-array['updated_at']) is not distinct from (a-array['updated_at']) then return coalesce(new,old); end if;
   perform public.editorial_emit(kind,sec,parent->>'id',parent,parent,'/yemen-ranking?indicator='||(parent->>'slug'),array['dataset']);return coalesce(new,old);
  end if;
 when 'site_settings' then
  target:=item->>'key';
  if target='public_content_pages_v1' then
   before_pages:=b->'value'->'pages';
   if before_pages is null then
    before_pages:=nullif(current_setting('app967.editorial_page_baseline',true),'')::jsonb;
    if jsonb_typeof(before_pages) is distinct from 'array' then raise exception 'First catalog write requires the verified existing public page baseline' using errcode='42501';end if;
   end if;
   for pageid in select distinct v->>'id' from (select jsonb_array_elements(before_pages) v union all select jsonb_array_elements(coalesce(a->'value'->'pages','[]'))) s loop
    select v into oldpage from jsonb_array_elements(before_pages) v where v->>'id'=pageid;
    select v into newpage from jsonb_array_elements(coalesce(a->'value'->'pages','[]')) v where v->>'id'=pageid;
    perform public.editorial_emit('page','pages',pageid,oldpage,newpage,case when coalesce(newpage,oldpage)->>'slug' in ('about','help','privacy','terms','privacy-requests') then '/'||(coalesce(newpage,oldpage)->>'slug') else '/pages/'||(coalesce(newpage,oldpage)->>'slug') end);
   end loop; return coalesce(new,old);
  elsif target like 'public_district_profile_v1_%' then
   target:=substr(target,length('public_district_profile_v1_')+1); kind:='district';sec:='atlas';route:='/yemen-map?district='||target;
   a:=a->'value'->'profile'; b:=coalesce(b->'value'->'profile','{}');
   if a is not null then a:=a||jsonb_build_object('title',coalesce(a->>'name',(select name_ar from public.districts where id=target),target)); end if;
   b:=b||jsonb_build_object('title',coalesce(b->>'name',(select name_ar from public.districts where id=target),target));
  elsif target in ('site_content','home_marquee_items','public_page_visibility_v1') then
   kind:='setting';sec:='settings';route:=case target when 'site_content' then '/about' else '/' end;
   a:=case when a is not null then jsonb_build_object('title',target,'content',a->'value') end; b:=case when b is not null then jsonb_build_object('title',target,'content',b->'value') end;
  else return coalesce(new,old); end if;
 else raise exception 'Unmapped editorial table %',TG_TABLE_NAME;
 end case;
 perform public.editorial_emit(kind,sec,target,b,a,route,extras);return coalesce(new,old);
end;
$$;
revoke all on function public.editorial_content_trigger() from public,anon,authenticated,service_role;
do $$ declare t text; begin foreach t in array array['issues','works','yemeni_companies','professionals','yemeni_figures','governorates','districts','debates','debate_speakers','debate_participants','debate_polls','debate_poll_options','debate_video_chapters','stat_sections','stat_domains','stat_sources','stat_indicators','stat_values','stat_indicator_sources','ranking_indicators','ranking_snapshots','site_settings'] loop
 execute format('create trigger editorial_committed_change after insert or update or delete on public.%I for each row execute function public.editorial_content_trigger()',t);
end loop;end $$;

-- The existing inline audit can only be written by trusted DB functions. Enrich,
-- rather than insert another event. Undo is updated on that row by its trusted RPC.
create function public.editorial_inline_bridge() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.editorial_contributions c set actor_id=new.actor_id,actor_name=coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'display_name',''),'عضو فريق'),actor_role=e.role,
 origin=case when new.kind in ('figure','page') then 'service:inline_content' else coalesce(nullif(current_setting('app967.editorial_origin',true),''),c.origin) end,
 action=case when new.action='undo' then 'restore' else c.action end
 from public.editors e join auth.users u on u.id=e.user_id where c.transaction_id=txid_current() and c.content_type=new.kind and c.content_id=new.target_id and e.user_id=new.actor_id;
 return new;
end;
$$;
revoke all on function public.editorial_inline_bridge() from public,anon,authenticated,service_role;
create trigger editorial_inline_identity after insert or update on public.inline_content_audit for each row execute function public.editorial_inline_bridge();

-- Service identity comes from the server's verified bearer user, never from a
-- browser RPC. Authenticated/anonymous roles cannot call or supply this context.
create function public.editorial_service_save(p_kind text,p_id text,p_revision timestamptz,p_data jsonb,p_actor uuid,p_action text default 'update',p_profile_changed boolean default false,p_page_baseline jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare saved jsonb; oldrow jsonb; stamp timestamptz;
begin
 if not exists(select 1 from public.editors e join auth.users u on u.id=e.user_id where e.user_id=p_actor and e.role in ('admin','management') and u.email_confirmed_at is not null and (nullif(to_jsonb(u)->>'banned_until','') is null or (to_jsonb(u)->>'banned_until')::timestamptz<=now())) then raise exception 'Verified editor required' using errcode='42501';end if;
 perform set_config('app967.editorial_actor',p_actor::text,true); perform set_config('app967.editorial_origin','service:'||p_kind,true);
 if p_kind in ('figure','page') then
  perform set_config('app967.editorial_profile_changed',p_profile_changed::text,true);
  if p_kind='page' then
   if p_page_baseline is not null and (jsonb_typeof(p_page_baseline)<>'array' or octet_length(p_page_baseline::text)>700000) then raise exception 'Invalid public page baseline' using errcode='22023';end if;
   perform set_config('app967.editorial_page_baseline',coalesce(p_page_baseline::text,''),true);
  end if;
  saved:=public.inline_service_save(p_kind,p_id,p_revision,p_data,p_actor,p_action);
 elsif p_kind='setting' then
  if not(p_id in ('public_page_visibility_v1') or p_id ~ '^public_district_profile_v1_YE[0-9]{4}$') or p_action<>'update' or jsonb_typeof(p_data)<>'object' then raise exception 'Invalid content setting' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id,0));
  select to_jsonb(s) into oldrow from public.site_settings s where key=p_id for update;
  if (oldrow->>'updated_at')::timestamptz is distinct from p_revision then raise exception 'Stale setting revision' using errcode='40001';end if;
  stamp:=greatest(clock_timestamp(),coalesce(p_revision,'epoch')+interval '1 millisecond');
  insert into public.site_settings(key,value,updated_at) values(p_id,p_data,stamp) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at returning to_jsonb(site_settings) into saved;
  saved:=jsonb_build_object('record',saved);
 elsif p_kind='ranking' then
  if p_id is not null then
   select to_jsonb(i) into oldrow from public.ranking_indicators i where id=p_id::uuid for update;
   if oldrow is null or p_revision is null or (oldrow->>'updated_at')::timestamptz is distinct from p_revision then raise exception 'Stale ranking revision' using errcode='40001';end if;
  elsif p_revision is not null then raise exception 'Invalid new ranking revision' using errcode='22023';end if;
  if p_action='snapshot' then
   if oldrow is null or p_data->'payload'->>'indicatorCode' is distinct from oldrow->>'code' then raise exception 'Ranking code changed' using errcode='40001';end if;
   insert into public.ranking_snapshots(indicator_id,payload,summary) values(p_id::uuid,p_data->'payload',p_data->'summary') on conflict(indicator_id) do update set payload=excluded.payload,summary=excluded.summary returning to_jsonb(ranking_snapshots) into saved;
  elsif p_action='update' then
   if exists(select 1 from jsonb_object_keys(p_data) k where k<>all(array['slug','name','category','unit','code','direction','better','description','display_order','is_published'])) then raise exception 'Protected ranking field' using errcode='42501';end if;
   if p_id is null then
    insert into public.ranking_indicators(slug,name,category,unit,code,direction,better,description,display_order,is_published) select x.slug,x.name,x.category,x.unit,x.code,x.direction,x.better,x.description,x.display_order,x.is_published from jsonb_populate_record(null::public.ranking_indicators,p_data) x returning to_jsonb(ranking_indicators) into saved;
   else update public.ranking_indicators set slug=p_data->>'slug',name=p_data->>'name',category=p_data->>'category',unit=p_data->>'unit',code=p_data->>'code',direction=p_data->>'direction',better=p_data->>'better',description=p_data->>'description',display_order=(p_data->>'display_order')::int,is_published=(p_data->>'is_published')::boolean where id=p_id::uuid returning to_jsonb(ranking_indicators) into saved;end if;
  else raise exception 'Invalid ranking action' using errcode='22023';end if;
  saved:=jsonb_build_object('record',saved);
 else raise exception 'Invalid editorial service kind' using errcode='22023';end if;
 perform set_config('app967.editorial_actor','',true);perform set_config('app967.editorial_origin','',true);perform set_config('app967.editorial_profile_changed','false',true);perform set_config('app967.editorial_page_baseline','',true);
 return saved;
end;
$$;
revoke all on function public.editorial_service_save(text,text,timestamptz,jsonb,uuid,text,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.editorial_service_save(text,text,timestamptz,jsonb,uuid,text,boolean,jsonb) to service_role;

create function public.editorial_inline_correction(p_kind text,p_id text,p_revision bigint,p_data jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved jsonb;
begin
 if not public.editorial_can_read() then raise exception 'Editor required' using errcode='42501';end if;
 perform set_config('app967.editorial_intent','correction',true);perform set_config('app967.editorial_origin','rpc:inline_correction',true);
 saved:=public.inline_content_save(p_kind,p_id,p_revision,p_data);
 perform set_config('app967.editorial_intent','',true);perform set_config('app967.editorial_origin','',true);return saved;
end;
$$;
revoke all on function public.editorial_inline_correction(text,text,bigint,jsonb) from public,anon;
grant execute on function public.editorial_inline_correction(text,text,bigint,jsonb) to authenticated;

create function public.editorial_statistic_save(p_id uuid,p_revision timestamptz,p_data jsonb,p_source_ids uuid[]) returns jsonb language plpgsql security invoker set search_path='' as $$
declare original public.stat_indicators; item public.stat_indicators; saved public.stat_indicators;
begin
 if not public.editorial_can_read() then raise exception 'Editor required' using errcode='42501';end if;
 if exists(select 1 from jsonb_object_keys(p_data) k where k<>all(array['domain_id','name','slug','short_description','definition','unit','improvement_direction','measurement_method','data_status','chart_type','adopted_source_id','is_published','hide_when_incomplete'])) then raise exception 'Protected statistic field' using errcode='42501';end if;
 if p_id is not null then select * into original from public.stat_indicators where id=p_id for update;if not found or p_revision is null or original.updated_at is distinct from p_revision then raise exception 'Stale statistic revision' using errcode='40001';end if;end if;
 item:=jsonb_populate_record(null::public.stat_indicators,p_data);
 if p_id is null then
  insert into public.stat_indicators(domain_id,name,slug,short_description,definition,unit,improvement_direction,measurement_method,data_status,chart_type,adopted_source_id,is_published,hide_when_incomplete) values(item.domain_id,item.name,item.slug,item.short_description,item.definition,item.unit,item.improvement_direction,item.measurement_method,item.data_status,item.chart_type,item.adopted_source_id,item.is_published,item.hide_when_incomplete) returning * into saved;
 else update public.stat_indicators set domain_id=item.domain_id,name=item.name,slug=item.slug,short_description=item.short_description,definition=item.definition,unit=item.unit,improvement_direction=item.improvement_direction,measurement_method=item.measurement_method,data_status=item.data_status,chart_type=item.chart_type,adopted_source_id=item.adopted_source_id,is_published=item.is_published,hide_when_incomplete=item.hide_when_incomplete where id=p_id returning * into saved;end if;
 if cardinality(p_source_ids)>100 or (item.adopted_source_id is not null and not item.adopted_source_id=any(coalesce(p_source_ids,'{}'))) then raise exception 'Invalid source selection' using errcode='22023';end if;
 -- Preserve methodology and series labels on unchanged links.
 delete from public.stat_indicator_sources where indicator_id=saved.id and not(source_id=any(coalesce(p_source_ids,'{}')));
 update public.stat_indicator_sources set is_adopted=false where indicator_id=saved.id and is_adopted and source_id is distinct from item.adopted_source_id;
 insert into public.stat_indicator_sources(indicator_id,source_id,is_adopted) select saved.id,s,coalesce(s=item.adopted_source_id,false) from (select distinct unnest(p_source_ids) s) u on conflict(indicator_id,source_id) do update set is_adopted=excluded.is_adopted where stat_indicator_sources.is_adopted is distinct from excluded.is_adopted;
 return jsonb_build_object('record',to_jsonb(saved));
end;
$$;
revoke all on function public.editorial_statistic_save(uuid,timestamptz,jsonb,uuid[]) from public,anon;
grant execute on function public.editorial_statistic_save(uuid,timestamptz,jsonb,uuid[]) to authenticated;

-- The debate editor replaces child rows in one RPC. Compare semantic child
-- state around that transaction, ignoring generated identities and timestamps.
create function public.editorial_debate_children(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare t text; result jsonb:='{}'; items jsonb;
begin
 foreach t in array array['debate_participants','debate_polls','debate_poll_options','debate_video_chapters'] loop
  execute format('select coalesce(jsonb_agg(v order by v::text),''[]'') from (select to_jsonb(r)-array[''id'',''created_at'',''updated_at'',''revision''] v from public.%I r where debate_id=$1) s',t) into items using p_id;
  result:=result||jsonb_build_object(t,items);
 end loop;return result;
end;
$$;
revoke all on function public.editorial_debate_children(uuid) from public,anon,authenticated,service_role;
alter function public.debate_admin_mutate(text,uuid,bigint,jsonb) rename to editorial_debate_mutate_legacy;
revoke all on function public.editorial_debate_mutate_legacy(text,uuid,bigint,jsonb) from public,anon,authenticated,service_role;
create function public.debate_admin_mutate(p_action text,p_id uuid default null,p_revision bigint default null,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare before_children jsonb; after_children jsonb; result jsonb; parent jsonb; fields text[];
begin
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
$$;
revoke all on function public.debate_admin_mutate(text,uuid,bigint,jsonb) from public,anon;
grant execute on function public.debate_admin_mutate(text,uuid,bigint,jsonb) to authenticated;
commit;
