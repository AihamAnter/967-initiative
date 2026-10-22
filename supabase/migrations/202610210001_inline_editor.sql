-- Apply after debates migrations 001, 002, 003 and the existing content schemas.
-- Review locally first. This migration never changes editor memberships or votes.
begin;

alter table public.debate_comments add column pinned_at timestamptz;
alter table public.debate_comments add column hidden_from_status text;
alter table public.debate_questions add column updated_at timestamptz not null default now();
alter table public.debate_questions add column hidden_from_status text;
alter table public.debate_questions drop constraint debate_questions_status_check;
alter table public.debate_questions add constraint debate_questions_status_check check(status in ('new','approved','selected','answered','rejected','hidden','deleted'));
alter table public.debate_reports add column updated_at timestamptz not null default now();
alter table public.public_profiles add column comments_restricted boolean not null default false;
alter table public.public_profiles add column questions_restricted boolean not null default false;
alter table public.debate_moderation_actions add column target_kind text;
alter table public.debate_moderation_actions add column before_value jsonb;
alter table public.debate_moderation_actions add column after_value jsonb;
alter table public.debate_moderation_actions add column undo_of uuid references public.debate_moderation_actions(id);
alter table public.debate_moderation_actions alter column created_at set default clock_timestamp();
create unique index debate_one_undo_idx on public.debate_moderation_actions(undo_of) where undo_of is not null;
create index debate_history_target_idx on public.debate_moderation_actions(target_id,created_at desc);
create index debate_pinned_idx on public.debate_comments(debate_id,pinned_at) where pinned_at is not null and status='approved';
alter table public.tasks add column source_type text check(source_type is null or length(source_type) between 1 and 60);
alter table public.tasks add column source_id text check(source_id is null or length(source_id)<=150);
alter table public.tasks add column source_url text check(source_url is null or (length(source_url)<=2000 and (source_url='/' or source_url ~ '^/[^/]') and source_url !~ '[[:cntrl:]]' and position(chr(92) in source_url)=0));

create function public.inline_comment_pin_guard() returns trigger language plpgsql set search_path='' as $$
begin if new.status<>'approved' then new.pinned_at:=null; end if;return new;end $$;
create trigger inline_comment_pin_guard before insert or update on public.debate_comments for each row execute function public.inline_comment_pin_guard();
revoke all on function public.inline_comment_pin_guard() from public,anon,authenticated;

-- Reuse the existing participation restriction and rate limiter. Selective
-- restrictions are additional fields on the same profile, not a second ban list.
alter function public.debate_require_user(text) rename to debate_require_user_base;
revoke all on function public.debate_require_user_base(text) from public,anon,authenticated;
create function public.debate_require_user(p_action text) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.public_profiles where user_id=auth.uid() and ((p_action='comment' and comments_restricted) or (p_action='question' and questions_restricted))) then raise exception 'Participation restricted' using errcode='42501'; end if;
 return public.debate_require_user_base(p_action);
end $$;
revoke all on function public.debate_require_user(text) from public,anon,authenticated;

create function public.inline_item(p_kind text,p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare x jsonb; s text; allowed text[]; r text:=public.debate_role();
begin
 if r is null then raise exception 'Editor required' using errcode='42501'; end if;
 if p_kind='comments' then
 select jsonb_build_object('kind','comments','id',c.id,'debate_id',c.debate_id,'body',c.body,'status',c.status,'created_at',c.created_at,'updated_at',c.updated_at,'display_name',coalesce(p.display_name,'حساب محذوف'),'pinned',c.pinned_at is not null,'pinned_at',c.pinned_at,'parent_id',c.parent_id,'hidden_from_status',c.hidden_from_status,'report_count',(select count(*) from public.debate_reports where comment_id=c.id and status='open')) into x from public.debate_comments c left join public.public_profiles p on p.user_id=c.user_id where c.id=p_id;
 elsif p_kind='questions' then
 select jsonb_build_object('kind','questions','id',q.id,'debate_id',q.debate_id,'body',q.body,'status',q.status,'created_at',q.created_at,'updated_at',q.updated_at,'display_name',case when q.anonymous then 'مشارك' else coalesce(p.display_name,'حساب محذوف') end,'anonymous',q.anonymous,'participant_id',q.participant_id,'axis',q.axis,'hidden_from_status',q.hidden_from_status) into x from public.debate_questions q left join public.public_profiles p on p.user_id=q.user_id where q.id=p_id;
 elsif p_kind='reports' then
 select jsonb_build_object('kind','reports','id',z.id,'debate_id',c.debate_id,'comment_id',z.comment_id,'body',z.reason,'comment_body',c.body,'status',z.status,'created_at',z.created_at,'updated_at',z.updated_at,'display_name','بلاغ') into x from public.debate_reports z join public.debate_comments c on c.id=z.comment_id where z.id=p_id;
 else raise exception 'Invalid item kind' using errcode='22023'; end if;
 if x is null then raise exception 'Record not found' using errcode='P0002'; end if;
 select x||jsonb_build_object('debate_title',d.title,'debate_slug',d.slug) into x from public.debates d where d.id=(x->>'debate_id')::uuid;
 s:=x->>'status';
 allowed:=case when p_kind='comments' then case s when 'pending' then array['approved','rejected','hidden'] when 'approved' then array['hidden'] when 'hidden' then array[coalesce(x->>'hidden_from_status','approved')] when 'rejected' then array['pending','approved'] else '{}'::text[] end
 when p_kind='questions' then case s when 'new' then array['approved','rejected','hidden'] when 'approved' then array['selected','rejected','hidden'] when 'selected' then array['approved','answered','hidden'] when 'answered' then array['selected','approved','hidden'] when 'hidden' then array[coalesce(x->>'hidden_from_status','new')] when 'rejected' then array['new','approved'] else '{}'::text[] end
 else case s when 'open' then array['resolved','dismissed'] else array['open'] end end;
 return x||jsonb_build_object('capabilities',jsonb_build_object('statuses',to_jsonb(allowed),'pin',p_kind='comments' and s='approved','delete',r='management' and p_kind in ('comments','questions') and s<>'deleted','account',p_kind='comments' or (p_kind='questions' and not coalesce((x->>'anonymous')::boolean,false)),'restrict',r='management' and (p_kind='comments' or (p_kind='questions' and not coalesce((x->>'anonymous')::boolean,false))),'history',true));
end $$;

-- Both the dashboard and inline tools call this one checked mutation function.
-- The previous implementation remains private for complex debate/poll workflows.
alter function public.debate_admin_mutate(text,uuid,bigint,jsonb) rename to debate_admin_mutate_base;
revoke all on function public.debate_admin_mutate_base(text,uuid,bigint,jsonb) from public,anon,authenticated;
-- Migration 003 uses x both as a PL/pgSQL loop variable and as an options-query
-- column alias. A full editor snapshot after voting reaches that comparison and
-- otherwise fails before the existing poll permission checks. Qualify only the
-- query alias; retain the original option locks and all canonical poll rules.
do $inline_alias_fix$
declare definition text; ambiguous_sql text:=$fragment$jsonb_build_object('id',x->>'id','label',x->>'label') order by ord$fragment$;
 qualified_sql text:=$fragment$jsonb_build_object('id',a.x->>'id','label',a.x->>'label') order by a.ord$fragment$;
begin
 definition:=pg_get_functiondef('public.debate_admin_mutate_base(text,uuid,bigint,jsonb)'::regprocedure);
 if position(ambiguous_sql in definition)>0 then execute replace(definition,ambiguous_sql,qualified_sql);
 elsif position(qualified_sql in definition)=0 then raise exception 'Review the options comparison before applying inline editing'; end if;
end $inline_alias_fix$;
create function public.debate_admin_mutate(p_action text,p_id uuid default null,p_revision bigint default null,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare r text:=public.debate_role(); old_value jsonb; new_value jsonb; x jsonb; result jsonb; saved uuid; audit_id uuid; k text:=p_data->>'kind'; wanted text:=p_data->>'status'; started timestamptz:=clock_timestamp(); reason text:=coalesce(p_data->>'reason','تحديث تحريري');
begin
 if r is null then raise exception 'Editor required' using errcode='42501'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>180000 then raise exception 'Invalid data' using errcode='22023'; end if;
 if p_action='moderate' and k in ('comments','questions','reports') then
  if length(btrim(reason)) not between 3 and 1000 then raise exception 'Reason required' using errcode='22023'; end if;
  if k='comments' then perform 1 from public.debate_comments where id=p_id for update;
  elsif k='questions' then perform 1 from public.debate_questions where id=p_id for update;
  else perform 1 from public.debate_reports where id=p_id for update; end if;
  old_value:=public.inline_item(k,p_id);
  if (p_data->>'updated_at')::timestamptz is distinct from (old_value->>'updated_at')::timestamptz then raise exception 'Item changed; review again' using errcode='40001'; end if;
  if wanted is null or not (old_value->'capabilities'->'statuses' ? wanted) then raise exception 'Invalid moderation transition' using errcode='22023'; end if;
  if k='comments' then update public.debate_comments set status=wanted,hidden_from_status=case when wanted='hidden' then status else hidden_from_status end,pinned_at=case when wanted='approved' then pinned_at end,updated_at=clock_timestamp() where id=p_id;
  elsif k='questions' then update public.debate_questions set status=wanted,hidden_from_status=case when wanted='hidden' then status else hidden_from_status end,updated_at=clock_timestamp() where id=p_id;
  else update public.debate_reports set status=wanted,updated_at=clock_timestamp() where id=p_id; end if;
  new_value:=public.inline_item(k,p_id);
  insert into public.debate_moderation_actions(actor_id,action,target_id,target_kind,reason,before_value,after_value) values(auth.uid(),'moderate',p_id,k,reason,old_value-array['body','display_name','comment_body','capabilities'],new_value-array['body','display_name','comment_body','capabilities']) returning id into audit_id;
  return jsonb_build_object('id',p_id,'item',new_value,'undo_id',case when wanted='hidden' then audit_id end);
 end if;
 if p_action in ('save','results_visibility','results_publish','delete','media','tasks') and p_id is not null then select to_jsonb(d)-array['results','created_by'] into old_value from public.debates d where id=p_id; k:='debates';
 elsif p_action='suspend' then select jsonb_build_object('suspended',p.suspended,'updated_at',p.updated_at) into old_value from public.public_profiles p where user_id=p_id; k:='account'; end if;
 result:=public.debate_admin_mutate_base(p_action,p_id,p_revision,p_data); saved:=(result->>'id')::uuid;
 if k='debates' then select to_jsonb(d)-array['results','created_by'] into new_value from public.debates d where id=saved;
 elsif k='account' then select jsonb_build_object('suspended',p.suspended,'updated_at',p.updated_at) into new_value from public.public_profiles p where user_id=saved; end if;
 -- Enrich the existing log entry instead of creating a duplicate history.
 update public.debate_moderation_actions set target_kind=coalesce(k,case when p_action='speaker' then 'speakers' when p_action='convert' then 'suggestions' else 'debates' end),before_value=old_value,after_value=new_value where id=(select id from public.debate_moderation_actions where actor_id=auth.uid() and target_id=saved and action=p_action and created_at>=started order by created_at desc limit 1);
 return result;
end $$;

create function public.inline_editor_read(p_view text,p_debate uuid default null,p_kind text default null,p_id uuid default null,p_status text default 'pending',p_page integer default 1,p_comment uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r text:=public.debate_role(); result jsonb; c integer; q integer; z integer; total_n integer; owner uuid; is_anon boolean; d jsonb; has_votes boolean; saved_results jsonb;
begin
 if r is null then raise exception 'Editor required' using errcode='42501'; end if;
 if p_debate is not null and not exists(select 1 from public.debates where id=p_debate) then raise exception 'Debate not found' using errcode='P0002'; end if;
 if p_view='session' then return jsonb_build_object('actor',jsonb_build_object('id',auth.uid(),'role',r)); end if;
 if p_view='counts' then
  select count(*) into c from public.debate_comments where status='pending' and (p_debate is null or debate_id=p_debate);
  select count(*) into q from public.debate_questions where status='new' and (p_debate is null or debate_id=p_debate);
  select count(*) into z from public.debate_reports a join public.debate_comments b on b.id=a.comment_id where a.status='open' and (p_debate is null or b.debate_id=p_debate);
  return jsonb_build_object('comments',c,'questions',q,'reports',z,'total',c+q+z);
 elsif p_view='capabilities' then
  select jsonb_build_object(
   'comments',coalesce((select jsonb_object_agg(a.id::text,public.inline_item('comments',a.id)->'capabilities') from public.debate_comments a where p_debate is null or a.debate_id=p_debate),'{}'),
   'questions',coalesce((select jsonb_object_agg(a.id::text,public.inline_item('questions',a.id)->'capabilities') from public.debate_questions a where p_debate is null or a.debate_id=p_debate),'{}'),
   'reports',coalesce((select jsonb_object_agg(a.id::text,public.inline_item('reports',a.id)->'capabilities') from public.debate_reports a join public.debate_comments b on b.id=a.comment_id where p_debate is null or b.debate_id=p_debate),'{}')
  ) into result;
  return jsonb_build_object('capabilities',result);
 elsif p_view='item' then return jsonb_build_object('item',public.inline_item(p_kind,p_id));
 elsif p_view='history' then
  perform public.inline_item(p_kind,p_id);
  select coalesce(jsonb_agg(a.row order by a.created_at desc),'[]') into result from (select jsonb_build_object('id',h.id,'action',h.action,'reason',h.reason,'created_at',h.created_at,'actor_name',coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'display_name','محرر'),'before_value',h.before_value,'after_value',h.after_value,'undo_of',h.undo_of) row,h.created_at from public.debate_moderation_actions h left join auth.users u on u.id=h.actor_id where h.target_id=p_id and (h.target_kind=p_kind or h.target_kind is null) order by h.created_at desc limit 100) a;
  return jsonb_build_object('items',result);
 elsif p_view='account' then
  if p_kind='comments' then select user_id,false into owner,is_anon from public.debate_comments where id=p_id;
  elsif p_kind='questions' then select user_id,anonymous into owner,is_anon from public.debate_questions where id=p_id; else raise exception 'Invalid kind' using errcode='22023'; end if;
  if owner is null or is_anon then raise exception 'Account unavailable' using errcode='42501'; end if;
  select jsonb_build_object('suspended',p.suspended,'comments_restricted',p.comments_restricted,'questions_restricted',p.questions_restricted,'updated_at',p.updated_at,'reason',p.suspension_reason,'can_restrict',r='management','actions_count',(select count(*) from public.debate_moderation_actions h where h.target_id=owner and h.target_kind='account')) into result from public.public_profiles p where user_id=owner;
  select coalesce(jsonb_agg(a.row order by a.created_at desc),'[]') into d from (select jsonb_build_object('id',h.id,'action',h.action,'created_at',h.created_at,'reason',h.reason,'before_value',h.before_value,'after_value',h.after_value) row,h.created_at from public.debate_moderation_actions h where h.target_id=owner and h.target_kind='account' order by h.created_at desc limit 50) a;
  result:=result||jsonb_build_object('actions',d);
  return result||jsonb_build_object('account',result);
 elsif p_view='debate' then
  select to_jsonb(b)-'results' into d from public.debates b where b.id=coalesce(p_id,p_debate);
  if d is null then raise exception 'Debate not found' using errcode='P0002'; end if;
  select d||jsonb_build_object('participants',coalesce((select jsonb_agg(to_jsonb(a) order by position) from public.debate_participants a where debate_id=(d->>'id')::uuid),'[]'),'options',coalesce((select jsonb_agg(to_jsonb(a) order by position) from public.debate_poll_options a where debate_id=(d->>'id')::uuid),'[]'),'polls',coalesce((select jsonb_agg(to_jsonb(a)) from public.debate_polls a where debate_id=(d->>'id')::uuid),'[]'),'chapters',coalesce((select jsonb_agg(to_jsonb(a) order by start_seconds) from public.debate_video_chapters a where debate_id=(d->>'id')::uuid),'[]')) into result;
  select exists(select 1 from public.debate_votes where debate_id=b.id),b.results into has_votes,saved_results from public.debates b where b.id=(d->>'id')::uuid;
  select result||jsonb_build_object('poll_capabilities',coalesce((select jsonb_object_agg(a.id::text,jsonb_build_object('can_reopen',a.enabled and not (saved_results ? a.phase) and (r='management' or not (has_votes or saved_results<>'{}'::jsonb)))) from public.debate_polls a where a.debate_id=(d->>'id')::uuid),'{}')) into result;
  return jsonb_build_object('debate',result);
 elsif p_view='queue' then
  if p_kind not in ('all','comments','questions','reports') or p_status not in ('pending','all') or p_page not between 1 and 10000 then raise exception 'Invalid queue filter' using errcode='22023'; end if;
  with records as (
   select 'comments' kind,id,debate_id,created_at from public.debate_comments where (p_kind in ('all','comments')) and (p_status='all' or status='pending') and (p_comment is null or id=p_comment)
   union all select 'questions',id,debate_id,created_at from public.debate_questions where (p_kind in ('all','questions')) and (p_status='all' or status='new') and p_comment is null
   union all select 'reports',a.id,b.debate_id,a.created_at from public.debate_reports a join public.debate_comments b on b.id=a.comment_id where (p_kind in ('all','reports')) and (p_status='all' or a.status='open') and (p_comment is null or a.comment_id=p_comment)
  ) select count(*) into total_n from records where p_debate is null or debate_id=p_debate;
  with records as (
   select 'comments' kind,id,debate_id,created_at from public.debate_comments where p_kind in ('all','comments') and (p_status='all' or status='pending') and (p_comment is null or id=p_comment)
   union all select 'questions',id,debate_id,created_at from public.debate_questions where p_kind in ('all','questions') and (p_status='all' or status='new') and p_comment is null
   union all select 'reports',a.id,b.debate_id,a.created_at from public.debate_reports a join public.debate_comments b on b.id=a.comment_id where p_kind in ('all','reports') and (p_status='all' or a.status='open') and (p_comment is null or a.comment_id=p_comment)
  ) select coalesce(jsonb_agg(public.inline_item(kind,id) order by created_at,id),'[]') into result from (select * from records where p_debate is null or debate_id=p_debate order by created_at,id limit 20 offset (p_page-1)*20) a;
  return jsonb_build_object('items',result,'total',total_n,'page',p_page,'pages',ceil(total_n/20.0));
 end if;
 raise exception 'Invalid view' using errcode='22023';
end $$;

create function public.inline_editor_mutate(p_action text,p_kind text default null,p_id uuid default null,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare r text:=public.debate_role(); old_value jsonb; new_value jsonb; audit_id uuid; h public.debate_moderation_actions; owner uuid; anon_question boolean; item jsonb; reason text:=p_data->>'reason'; task_result jsonb; result jsonb; n integer;
begin
 if r is null then raise exception 'Editor required' using errcode='42501'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>180000 then raise exception 'Invalid data' using errcode='22023'; end if;
 if p_action='moderate' then return public.debate_admin_mutate('moderate',p_id,null,p_data||jsonb_build_object('kind',p_kind)); end if;
 if p_action='task' then
  if coalesce(p_data->>'source_type','') not in ('debate','issue','work','company','professional','figure','page','statistic','ranking','governorate','district','map') or not (p_data->>'source_url'='/' or coalesce(p_data->>'source_url','') ~ '^/[^/]') or length(p_data->>'source_url')>2000 or length(coalesce(p_data->>'source_id',''))>150 then raise exception 'Invalid task source' using errcode='22023'; end if;
  task_result:=public.task_mutate('create',null,null,jsonb_build_object('title',p_data->>'title','description',coalesce(p_data->>'description',''),'assigned_to',coalesce(p_data->>'assigned_to',auth.uid()::text),'tags',jsonb_build_array('التحرير المباشر')));
  update public.tasks set source_type=p_data->>'source_type',source_id=nullif(p_data->>'source_id',''),source_url=p_data->>'source_url' where id=(task_result->>'id')::uuid;
  if p_data->>'source_type'='debate' and exists(select 1 from public.debates where id=(p_data->>'source_id')::uuid) then insert into public.debate_task_links values((p_data->>'source_id')::uuid,(task_result->>'id')::uuid); end if;
  return task_result;
 elsif p_action='undo' then
  select * into h from public.debate_moderation_actions where id=p_id for update;
  if not found or h.action<>'moderate' or h.after_value->>'status'<>'hidden' or h.target_kind not in ('comments','questions') then raise exception 'Undo unavailable' using errcode='22023'; end if;
  if exists(select 1 from public.debate_moderation_actions where undo_of=h.id) then raise exception 'Already undone' using errcode='40001'; end if;
  if h.target_kind='comments' then perform 1 from public.debate_comments where id=h.target_id for update; else perform 1 from public.debate_questions where id=h.target_id for update; end if;
  item:=public.inline_item(h.target_kind,h.target_id);
  if (item->>'updated_at')::timestamptz is distinct from (h.after_value->>'updated_at')::timestamptz then raise exception 'Item changed' using errcode='40001'; end if;
  result:=public.debate_admin_mutate('moderate',h.target_id,null,jsonb_build_object('kind',h.target_kind,'status',h.before_value->>'status','updated_at',item->>'updated_at','reason','تراجع عن الإخفاء'));
  update public.debate_moderation_actions set undo_of=h.id,action='undo' where id=(select id from public.debate_moderation_actions where actor_id=auth.uid() and target_id=h.target_id order by created_at desc limit 1);
  return result-'undo_id';
 end if;
 if length(btrim(coalesce(reason,''))) not between 3 and 1000 then raise exception 'Reason required' using errcode='22023'; end if;
 if p_action in ('pin','delete') then
  if p_kind='comments' then perform 1 from public.debate_comments where id=p_id for update;
  elsif p_kind='questions' and p_action='delete' then perform 1 from public.debate_questions where id=p_id for update;
  else raise exception 'Invalid kind' using errcode='22023'; end if;
  old_value:=public.inline_item(p_kind,p_id);
  if (p_data->>'updated_at')::timestamptz is distinct from (old_value->>'updated_at')::timestamptz then raise exception 'Item changed' using errcode='40001'; end if;
  if p_action='pin' then
   if old_value->>'status'<>'approved' or not (p_data ? 'pinned') then raise exception 'Only approved comments can be pinned' using errcode='22023'; end if;
   -- Serializes the cap even when different comments are pinned concurrently.
   perform 1 from public.debates where id=(old_value->>'debate_id')::uuid for update;
   if (p_data->>'pinned')::boolean and old_value->>'pinned'='false' and (select count(*) from public.debate_comments where debate_id=(old_value->>'debate_id')::uuid and pinned_at is not null and status='approved')>=3 then raise exception 'At most three pinned comments' using errcode='22023'; end if;
   update public.debate_comments set pinned_at=case when (p_data->>'pinned')::boolean then coalesce(pinned_at,clock_timestamp()) end,updated_at=clock_timestamp() where id=p_id;
  else
   if r<>'management' or coalesce((p_data->>'confirmed')::boolean,false)=false then raise exception 'Management confirmation required' using errcode='42501'; end if;
   if old_value->>'status'='deleted' then raise exception 'Already deleted' using errcode='22023'; end if;
   if p_kind='comments' then update public.debate_comments set status='deleted',body='حُذف التعليق',pinned_at=null,updated_at=clock_timestamp() where id=p_id;
   else update public.debate_questions set status='deleted',body='حُذف السؤال',updated_at=clock_timestamp() where id=p_id; end if;
  end if;
  new_value:=public.inline_item(p_kind,p_id);
 elsif p_action='restrict' then
  if r<>'management' then raise exception 'Management required' using errcode='42501'; end if;
  if p_kind='comments' then select user_id,false into owner,anon_question from public.debate_comments where id=p_id;
  elsif p_kind='questions' then select user_id,anonymous into owner,anon_question from public.debate_questions where id=p_id; else raise exception 'Invalid kind' using errcode='22023'; end if;
  if owner is null or anon_question or exists(select 1 from public.editors where user_id=owner) then raise exception 'Account action unavailable' using errcode='42501'; end if;
  select jsonb_build_object('comments_restricted',p.comments_restricted,'questions_restricted',p.questions_restricted,'updated_at',p.updated_at) into old_value from public.public_profiles p where user_id=owner for update;
  if old_value is null then raise exception 'Profile not found' using errcode='P0002'; end if;
  if (p_data->>'updated_at')::timestamptz is distinct from (old_value->>'updated_at')::timestamptz then raise exception 'Account changed' using errcode='40001'; end if;
  if not (p_data ? 'comments_restricted' or p_data ? 'questions_restricted') then raise exception 'Missing restriction' using errcode='22023'; end if;
  update public.public_profiles set comments_restricted=coalesce((p_data->>'comments_restricted')::boolean,comments_restricted),questions_restricted=coalesce((p_data->>'questions_restricted')::boolean,questions_restricted),suspension_reason=reason,updated_at=clock_timestamp() where user_id=owner;
  select jsonb_build_object('comments_restricted',p.comments_restricted,'questions_restricted',p.questions_restricted,'updated_at',p.updated_at) into new_value from public.public_profiles p where user_id=owner;
  insert into public.debate_moderation_actions(actor_id,action,target_id,target_kind,reason,before_value,after_value) values(auth.uid(),'restrict',owner,'account',reason,old_value,new_value);
  return public.inline_editor_read('account',null,p_kind,p_id);
 else raise exception 'Invalid action' using errcode='22023'; end if;
 insert into public.debate_moderation_actions(actor_id,action,target_id,target_kind,reason,before_value,after_value) values(auth.uid(),p_action,p_id,p_kind,reason,old_value-array['body','display_name','capabilities'],new_value-array['body','display_name','capabilities']) returning id into audit_id;
 return jsonb_build_object('id',p_id,'item',new_value);
end $$;

-- Public projections still redact identities, hidden records and private review data.
create or replace function public.debate_discussion(p_debate uuid,p_kind text,p_page integer default 1,p_order text default 'newest') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb; total integer; offset_n integer:=greatest(0,least(p_page,10000)-1)*20;
begin
 if not public.debate_visible(p_debate) then return jsonb_build_object('items','[]'::jsonb,'total',0); end if;
 if p_kind='comments' then
 select count(*) into total from public.debate_comments where debate_id=p_debate and status='approved';
 select coalesce(jsonb_agg(v.row),'[]') into items from (
  select jsonb_build_object('id',c.id,'body',c.body,'parent_id',c.parent_id,'created_at',c.created_at,'updated_at',c.updated_at,'pinned',c.pinned_at is not null,'display_name',coalesce(p.display_name,'حساب محذوف'),'avatar_url',case when p.show_avatar then p.avatar_url end) row
  from public.debate_comments c left join public.public_profiles p on p.user_id=c.user_id where c.debate_id=p_debate and c.status='approved'
  order by (c.pinned_at is not null) desc,case when p_order='oldest' then c.created_at end asc,case when p_order<>'oldest' then c.created_at end desc,c.id limit 20 offset offset_n) v;
 elsif p_kind='questions' then
 select count(*) into total from public.debate_questions where debate_id=p_debate and status in ('approved','selected','answered');
 select coalesce(jsonb_agg(v.row),'[]') into items from (
  select jsonb_build_object('id',q.id,'body',q.body,'axis',q.axis,'participant_id',q.participant_id,'status',q.status,'created_at',q.created_at,'display_name',case when q.anonymous then 'مشارك' else coalesce(p.display_name,'حساب محذوف') end) row
  from public.debate_questions q left join public.public_profiles p on p.user_id=q.user_id where q.debate_id=p_debate and q.status in ('approved','selected','answered') order by q.created_at desc,q.id limit 20 offset offset_n) v;
 else raise exception 'Invalid discussion kind' using errcode='22023'; end if;
 return jsonb_build_object('items',items,'total',total,'page',greatest(1,p_page));
end $$;

-- Resolve a public deep link beyond the first discussion page. Reuse the public
-- discussion projection rather than introducing a second identity-bearing shape.
create function public.debate_discussion_target(p_debate uuid,p_kind text,p_id uuid,p_order text default 'newest') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare position_n bigint; page_n integer; discussion jsonb; item jsonb;
begin
 if p_kind not in ('comments','questions') or p_order not in ('newest','oldest') then raise exception 'Invalid discussion target' using errcode='22023'; end if;
 if not public.debate_visible(p_debate) then return null; end if;
 if p_kind='comments' then
  select a.n into position_n from (select id,row_number() over(order by (pinned_at is not null) desc,case when p_order='oldest' then created_at end asc,case when p_order<>'oldest' then created_at end desc,id) n from public.debate_comments where debate_id=p_debate and status='approved') a where a.id=p_id;
 else
  select a.n into position_n from (select id,row_number() over(order by created_at desc,id) n from public.debate_questions where debate_id=p_debate and status in ('approved','selected','answered')) a where a.id=p_id;
 end if;
 if position_n is null then return null; end if;
 page_n:=ceil(position_n/20.0)::integer;
 if page_n>10000 then return null; end if;
 discussion:=public.debate_discussion(p_debate,p_kind,page_n,p_order);
 select value into item from jsonb_array_elements(discussion->'items') where value->>'id'=p_id::text;
 if item is null then return null; end if;
 return jsonb_build_object('item',item,'page',page_n);
end $$;
revoke all on function public.debate_discussion_target(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.debate_discussion_target(uuid,text,uuid,text) to anon,authenticated;

-- General content audit. Debate actions remain in their existing history table.
create table public.inline_content_audit (
 id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users(id) on delete set null,
 kind text not null,target_id text not null,action text not null,reason text not null default 'تحديث تحريري',
 before_value jsonb,after_value jsonb,undo_of uuid references public.inline_content_audit(id),created_at timestamptz not null default clock_timestamp()
);
create unique index inline_content_one_undo_idx on public.inline_content_audit(undo_of) where undo_of is not null;
create index inline_content_history_idx on public.inline_content_audit(kind,target_id,created_at desc);
alter table public.inline_content_audit enable row level security;
revoke all on public.inline_content_audit from public,anon,authenticated;
grant select on public.inline_content_audit to authenticated;
create policy inline_content_audit_editor on public.inline_content_audit for select to authenticated using(public.debate_role() is not null);

create function public.inline_content_table(p_kind text) returns text language sql immutable set search_path='' as $$
 select case p_kind when 'issue' then 'issues' when 'work' then 'works' when 'company' then 'yemeni_companies' when 'professional' then 'professionals' when 'governorate' then 'governorates' when 'district' then 'districts' end
$$;
create function public.inline_content_fields(p_kind text) returns text[] language sql immutable set search_path='' as $$
 select case p_kind
 when 'issue' then array['title','slug','number','summary','issue_date','is_published','cover_url','pdf_url']
 when 'work' then array['title','slug','summary','category','platform','external_url','thumbnail_url','published_at','is_published']
 when 'company' then array['name','slug','legal_name','category','location','scale','entity_type','ownership','owner_name','ceo_name','founded','team_size','address','google_maps_url','website','email','phone','summary','story','impact','strengths','markets','products','image_url','image_position','is_published']
 when 'professional' then array['full_name','slug','profession_title','category','location','service_areas','service_mode','years_experience','availability','bio','services','skills','languages','phone','whatsapp','email','website','instagram','profile_image_url','image_position','is_verified','is_published']
 when 'governorate' then array['description','history','geography','economy','landmarks','capital','image_url']
 when 'district' then array['description','landmarks','capital','image_url'] end
$$;
create function public.inline_content_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare kind text:=tg_argv[0];
begin
 if auth.uid() is not null and public.debate_role() is null then raise exception 'Editor required' using errcode='42501'; end if;
 if tg_op='UPDATE' then
  if new.id::text<>old.id::text then raise exception 'Immutable content identity' using errcode='42501'; end if;
  new.revision:=old.revision+1;
 else new.revision:=1; end if;
 new.updated_at:=clock_timestamp();
 return new;
end $$;
create function public.inline_content_audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare old_safe jsonb; new_safe jsonb; row_id text;
begin
 if auth.uid() is null then return coalesce(new,old); end if;
 if tg_op<>'INSERT' then select jsonb_object_agg(key,value) into old_safe from jsonb_each(to_jsonb(old)) where key=any(public.inline_content_fields(tg_argv[0])||array['revision','updated_at']);row_id:=old.id::text; end if;
 if tg_op<>'DELETE' then select jsonb_object_agg(key,value) into new_safe from jsonb_each(to_jsonb(new)) where key=any(public.inline_content_fields(tg_argv[0])||array['revision','updated_at']);row_id:=new.id::text; end if;
 insert into public.inline_content_audit(actor_id,kind,target_id,action,before_value,after_value) values(auth.uid(),tg_argv[0],row_id,lower(tg_op),old_safe,new_safe);
 return coalesce(new,old);
end $$;
do $$ declare kind text; tab text; begin
 foreach kind in array array['issue','work','company','professional','governorate','district'] loop
  tab:=public.inline_content_table(kind);
  if to_regclass('public.'||tab) is null then continue; end if;
  execute format('alter table public.%I add column if not exists revision bigint not null default 1',tab);
  execute format('alter table public.%I add column if not exists updated_at timestamptz not null default now()',tab);
  execute format('create trigger inline_content_guard before insert or update on public.%I for each row execute function public.inline_content_guard(%L)',tab,kind);
  execute format('create trigger inline_content_audit after insert or update or delete on public.%I for each row execute function public.inline_content_audit_change(%L)',tab,kind);
 end loop;
end $$;

create function public.inline_content_read(p_kind text,p_id text,p_history boolean default false) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare tab text:=public.inline_content_table(p_kind); item jsonb; result jsonb;
begin
 if public.debate_role() is null then raise exception 'Editor required' using errcode='42501'; end if;
 if p_history then
  if tab is null and p_kind not in ('figure','page') then raise exception 'Invalid history kind' using errcode='22023'; end if;
  select coalesce(jsonb_agg(a.row order by a.created_at desc),'[]') into result from (select jsonb_build_object('id',h.id,'action',h.action,'reason',h.reason,'created_at',h.created_at,'actor_name',coalesce(u.raw_user_meta_data->>'full_name','محرر'),'before_value',h.before_value,'after_value',h.after_value) row,h.created_at from public.inline_content_audit h left join auth.users u on u.id=h.actor_id where h.kind=p_kind and h.target_id=p_id order by h.created_at desc limit 100) a;
  return jsonb_build_object('items',result);
 end if;
 if tab is null or to_regclass('public.'||tab) is null then raise exception 'Content unavailable' using errcode='P0002'; end if;
 execute format('select to_jsonb(t) from public.%I t where id::text=$1',tab) into item using p_id;
 if item is null then raise exception 'Content not found' using errcode='P0002'; end if;
 return jsonb_build_object('item',item,'revision',item->'revision');
end $$;

create function public.inline_content_save(p_kind text,p_id text,p_revision bigint,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare tab text:=public.inline_content_table(p_kind); current_row jsonb; combined jsonb; item jsonb; k text; product jsonb; source jsonb; numeric_key text; setters text; audit_id uuid; started timestamptz:=clock_timestamp();
begin
 if public.debate_role() is null then raise exception 'Editor required' using errcode='42501'; end if;
 if tab is null or to_regclass('public.'||tab) is null then raise exception 'Content unavailable' using errcode='P0002'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or p_data='{}' or octet_length(p_data::text)>180000 then raise exception 'Invalid patch' using errcode='22023'; end if;
 for k in select jsonb_object_keys(p_data) loop
  if not (k=any(public.inline_content_fields(p_kind))) then raise exception 'Protected content field' using errcode='42501'; end if;
  if k in ('is_verified','is_published') and jsonb_typeof(p_data->k) is distinct from 'boolean' then raise exception 'Boolean required' using errcode='22023'; end if;
  if k in ('website','google_maps_url','external_url','cover_url','pdf_url','thumbnail_url','image_url','profile_image_url','instagram') and nullif(p_data->>k,'') is not null and (length(p_data->>k)>2000 or p_data->>k !~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$') then raise exception 'Invalid content URL' using errcode='22023'; end if;
 end loop;
 execute format('select to_jsonb(t) from public.%I t where id::text=$1 for update',tab) into current_row using p_id;
 if current_row is null then raise exception 'Content not found' using errcode='P0002'; end if;
 if p_revision is distinct from (current_row->>'revision')::bigint then raise exception 'Revision conflict' using errcode='40001'; end if;
 if p_kind='work' and current_row->>'debate_id' is not null then raise exception 'Edit linked work through its debate' using errcode='42501'; end if;
 combined:=current_row||p_data;
 if p_kind='company' then
  if length(btrim(coalesce(combined->>'name',''))) not between 2 and 180 or length(btrim(coalesce(combined->>'category','')))<1 or length(btrim(coalesce(combined->>'location','')))<1 then raise exception 'Complete company details' using errcode='22023'; end if;
  if p_data ? 'products' then
   if jsonb_typeof(p_data->'products') is distinct from 'array' or jsonb_array_length(p_data->'products') not between 1 and 200 then raise exception 'Invalid product list' using errcode='22023'; end if;
   for product in select value from jsonb_array_elements(p_data->'products') loop
    if jsonb_typeof(product)<>'object' or jsonb_typeof(product->'name') is distinct from 'string' or length(btrim(product->>'name')) not between 1 and 250 then raise exception 'Product name required' using errcode='22023'; end if;
    if nullif(product->>'image_url','') is not null and (length(product->>'image_url')>2000 or product->>'image_url' !~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$') then raise exception 'Invalid product image' using errcode='22023'; end if;
    if product ? 'currency' and product->>'currency' not in ('YER','SAR','USD') then raise exception 'Invalid product currency' using errcode='22023'; end if;
    foreach numeric_key in array array['quantity','wholesale_price','retail_price'] loop
     if product->numeric_key is not null and product->numeric_key<>'null'::jsonb and (jsonb_typeof(product->numeric_key)<>'number' or (product->>numeric_key)::numeric<0) then raise exception 'Invalid product amount' using errcode='22023'; end if;
    end loop;
    if product ? 'sources' then
     if jsonb_typeof(product->'sources')<>'array' or jsonb_array_length(product->'sources')>12 then raise exception 'Invalid product sources' using errcode='22023'; end if;
     for source in select value from jsonb_array_elements(product->'sources') loop
      if jsonb_typeof(source)<>'object' or length(btrim(coalesce(source->>'title',''))) not between 1 and 180 or coalesce(source->>'url','') !~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$' then raise exception 'Invalid product source' using errcode='22023'; end if;
      if nullif(source->>'reviewedAt','') is not null and ((source->>'reviewedAt') !~ '^\d{4}-\d{2}-\d{2}$' or ((source->>'reviewedAt')::date)::text<>source->>'reviewedAt') then raise exception 'Invalid source review date' using errcode='22023'; end if;
     end loop;
    end if;
   end loop;
  end if;
 end if;
 if p_kind='professional' then
  if length(btrim(coalesce(combined->>'full_name',''))) not between 2 and 160 or length(btrim(coalesce(combined->>'profession_title','')))<2 or length(btrim(coalesce(combined->>'location','')))<2 or jsonb_typeof(combined->'services')<>'array' or jsonb_array_length(combined->'services')<1 then raise exception 'Complete professional profile' using errcode='22023'; end if;
  if (combined->>'is_verified')::boolean and coalesce(combined->>'email','') ~* '@(example\.(com|org|net)|test\.(com|invalid))$' then raise exception 'Example contact cannot be verified' using errcode='22023'; end if;
 end if;
 select string_agg(format('%I = v.%I',key,key),',') into setters from jsonb_object_keys(p_data) key;
 execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$1) v where t.id::text=$2 returning to_jsonb(t)',tab,setters,tab) into item using combined,p_id;
 if current_row->>'is_published'='true' and item->>'is_published'='false' then select id into audit_id from public.inline_content_audit where kind=p_kind and target_id=p_id and actor_id=auth.uid() and created_at>=started order by created_at desc limit 1; end if;
 return jsonb_build_object('item',item,'revision',item->'revision','undo_id',audit_id);
end $$;

create function public.inline_content_undo(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare h public.inline_content_audit; current_row jsonb; result jsonb; started timestamptz:=clock_timestamp();
begin
 if public.debate_role() is null then raise exception 'Editor required' using errcode='42501'; end if;
 select * into h from public.inline_content_audit where id=p_id for update;
 if not found or h.after_value->>'is_published'<>'false' or h.before_value->>'is_published'<>'true' or exists(select 1 from public.inline_content_audit where undo_of=p_id) then raise exception 'Undo unavailable' using errcode='40001'; end if;
 current_row:=public.inline_content_read(h.kind,h.target_id)->'item';
 if (current_row->>'revision')::bigint is distinct from (h.after_value->>'revision')::bigint then raise exception 'Content changed' using errcode='40001'; end if;
 result:=public.inline_content_save(h.kind,h.target_id,(current_row->>'revision')::bigint,jsonb_build_object('is_published',true));
 update public.inline_content_audit set action='undo',undo_of=h.id,reason='تراجع عن إلغاء النشر' where id=(select id from public.inline_content_audit where kind=h.kind and target_id=h.target_id and actor_id=auth.uid() and created_at>=started order by created_at desc limit 1);
 return result;
end $$;

-- Existing figure and CMS APIs retain their validators and private-file workflow.
-- Only their final compare-and-swap moves here so the row and audit commit together.
-- The service credential stays on the server; the verified actor is rechecked here.
create function public.inline_service_save(p_kind text,p_id text,p_revision timestamptz,p_data jsonb,p_actor uuid,p_action text default 'update') returns jsonb language plpgsql security definer set search_path='' as $$
declare r text; old_row jsonb; saved jsonb; payload jsonb; old_page jsonb; new_page jsonb; page_id text; k text; cols text; setters text; allowed text[]; safe_fields text[];
begin
 select role into r from public.editors where user_id=p_actor and role in ('admin','management');
 if r is null then raise exception 'Editor required' using errcode='42501'; end if;
 if p_action not in ('create','update','delete') or p_kind not in ('figure','page') or length(coalesce(p_id,'')) not between 1 and 150 or jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>700000 then raise exception 'Invalid service content mutation' using errcode='22023'; end if;
 if p_action='delete' and r<>'management' then raise exception 'Management required' using errcode='42501'; end if;
 if p_kind='figure' then
  if to_regclass('public.yemeni_figures') is null then raise exception 'Figure schema unavailable' using errcode='P0002'; end if;
  select to_jsonb(t) into old_row from public.yemeni_figures t where id=p_id::uuid for update;
  if (old_row is null and p_revision is not null) or (old_row is not null and (old_row->>'updated_at')::timestamptz is distinct from p_revision) then raise exception 'Revision conflict' using errcode='40001'; end if;
  if p_action='create' and old_row is not null or p_action in ('update','delete') and old_row is null then raise exception 'Revision conflict' using errcode='40001'; end if;
  safe_fields:=array['id','slug','full_name','known_for','field','governorate_id','governorate_name','era','birth_year','death_year','is_published','image_url','updated_at'];
  if p_action='delete' then delete from public.yemeni_figures where id=p_id::uuid; saved:=jsonb_build_object('id',p_id);
  else
   allowed:=array['id','slug','full_name','known_for','field','governorate_id','governorate_name','era','birth_year','death_year','short_bio','image_url','website','facebook_url','instagram_url','x_url','youtube_url','display_order','is_published','image_credit','image_source_url','updated_at'];
   for k in select jsonb_object_keys(p_data) loop if not k=any(allowed) then raise exception 'Protected figure field' using errcode='42501'; end if; end loop;
   if p_data->>'id' is distinct from p_id or p_data->>'updated_at' is null or (old_row is not null and (p_data->>'updated_at')::timestamptz<=(old_row->>'updated_at')::timestamptz) then raise exception 'Invalid figure revision' using errcode='22023'; end if;
   payload:=coalesce(old_row,'{}')||p_data;
   if p_action='create' then
    select string_agg(format('%I',key),','),string_agg(format('v.%I',key),',') into cols,setters from jsonb_object_keys(p_data) key;
    execute format('insert into public.yemeni_figures(%s) select %s from jsonb_populate_record(null::public.yemeni_figures,$1) v returning to_jsonb(yemeni_figures)',cols,setters) into saved using payload;
   else
    select string_agg(format('%I = v.%I',key,key),',') into setters from jsonb_object_keys(p_data) key where key<>'id';
    execute format('update public.yemeni_figures t set %s from jsonb_populate_record(null::public.yemeni_figures,$1) v where t.id=$2 returning to_jsonb(t)',setters) into saved using payload,p_id::uuid;
   end if;
  end if;
  select jsonb_object_agg(key,value) into old_page from jsonb_each(old_row) where key=any(safe_fields);
  select jsonb_object_agg(key,value) into new_page from jsonb_each(saved) where key=any(safe_fields);
  insert into public.inline_content_audit(actor_id,kind,target_id,action,before_value,after_value) values(p_actor,'figure',p_id,p_action,old_page,new_page);
 else
  if to_regclass('public.site_settings') is null then raise exception 'CMS schema unavailable' using errcode='P0002'; end if;
  if p_id<>'public_content_pages_v1' or p_data->>'key' is distinct from p_id or jsonb_typeof(p_data->'value'->'pages') is distinct from 'array' or p_data->>'updated_at' is null then raise exception 'Invalid catalog payload' using errcode='22023'; end if;
  select to_jsonb(t) into old_row from public.site_settings t where key=p_id for update;
  if (old_row is null and p_revision is not null) or (old_row is not null and (old_row->>'updated_at')::timestamptz is distinct from p_revision) then raise exception 'Revision conflict' using errcode='40001'; end if;
  if old_row is not null and (p_data->>'updated_at')::timestamptz<=(old_row->>'updated_at')::timestamptz then raise exception 'Invalid catalog revision' using errcode='22023'; end if;
  -- Infer deletions from the data, rather than trusting the action label supplied
  -- by a server that may have authorized an editor just before a role change.
  if r<>'management' and exists(select 1 from jsonb_array_elements(coalesce(old_row->'value'->'pages','[]')) op where not exists(select 1 from jsonb_array_elements(p_data->'value'->'pages') np where np->>'id'=op->>'id')) then raise exception 'Management required to remove pages' using errcode='42501'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(old_row->'value'->'pages','[]')) op join lateral jsonb_array_elements(p_data->'value'->'pages') np on np->>'id'=op->>'id' where op->>'slug' in ('about','help','privacy','terms','privacy-requests') and np->>'slug' is distinct from op->>'slug') then raise exception 'Built-in page route is immutable' using errcode='22023'; end if;
  if old_row is null then insert into public.site_settings(key,value,updated_at) values(p_id,p_data->'value',(p_data->>'updated_at')::timestamptz) returning to_jsonb(site_settings) into saved;
  else update public.site_settings set value=p_data->'value',updated_at=(p_data->>'updated_at')::timestamptz where key=p_id returning to_jsonb(site_settings) into saved; end if;
  for page_id in select distinct x->>'id' from (select value x from jsonb_array_elements(coalesce(old_row->'value'->'pages','[]')) union all select value from jsonb_array_elements(saved->'value'->'pages')) a loop
   select value into old_page from jsonb_array_elements(coalesce(old_row->'value'->'pages','[]')) where value->>'id'=page_id;
   select value into new_page from jsonb_array_elements(saved->'value'->'pages') where value->>'id'=page_id;
   if old_page is distinct from new_page then
    -- Store only descriptive metadata, not entire legal text or internal drafts.
    select jsonb_object_agg(key,value) into old_page from jsonb_each(old_page) where key in ('id','slug','title','description','is_published','updatedAt');
    select jsonb_object_agg(key,value) into new_page from jsonb_each(new_page) where key in ('id','slug','title','description','is_published','updatedAt');
    insert into public.inline_content_audit(actor_id,kind,target_id,action,before_value,after_value) values(p_actor,'page',page_id,p_action,old_page,new_page);
   end if;
  end loop;
 end if;
 return jsonb_build_object('record',saved,'revision',saved->'updated_at');
end $$;
revoke all on function public.inline_service_save(text,text,timestamptz,jsonb,uuid,text) from public,anon,authenticated;
do $$ begin if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.inline_service_save(text,text,timestamptz,jsonb,uuid,text) to service_role; end if;end $$;

revoke all on function public.inline_item(text,uuid),public.inline_editor_read(text,uuid,text,uuid,text,integer,uuid),public.inline_editor_mutate(text,text,uuid,jsonb),public.inline_content_table(text),public.inline_content_fields(text),public.inline_content_guard(),public.inline_content_audit_change(),public.inline_content_read(text,text,boolean),public.inline_content_save(text,text,bigint,jsonb),public.inline_content_undo(uuid),public.debate_admin_mutate(text,uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.inline_editor_read(text,uuid,text,uuid,text,integer,uuid),public.inline_editor_mutate(text,text,uuid,jsonb),public.inline_content_read(text,text,boolean),public.inline_content_save(text,text,bigint,jsonb),public.inline_content_undo(uuid),public.debate_admin_mutate(text,uuid,bigint,jsonb) to authenticated;
comment on table public.inline_content_audit is 'Internal content audit only; no tokens, ballots, or anonymous question owner identities.';
commit;
