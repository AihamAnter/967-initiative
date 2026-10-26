-- Additive upgrade. Prerequisites: task-center.sql + task_auto_archive migration.
-- Review/test separately. Never seed or reinitialize an existing installation.
begin;

create table public.task_members (
 task_id uuid not null references public.tasks(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete restrict,
 added_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp(),
 primary key(task_id,user_id)
);
create index task_members_user_idx on public.task_members(user_id,task_id);
alter table public.task_comments add column parent_id uuid,
 add column deleted_at timestamptz,
 add column revision bigint not null default 1,
 add column mention_ids uuid[] not null default '{}';
alter table public.task_comments add constraint task_comments_task_identity unique(task_id,id),
 add constraint task_comments_same_task_parent foreign key(task_id,parent_id) references public.task_comments(task_id,id) on delete restrict,
 add constraint task_comments_not_self check(parent_id is distinct from id),
 add constraint task_comments_mentions_limit check(cardinality(mention_ids)<=20);
create index task_comments_thread_idx on public.task_comments(task_id,parent_id,created_at,id);
alter table public.task_notifications drop constraint task_notifications_kind_check;
alter table public.task_notifications add constraint task_notifications_kind_check check(kind in
 ('assignment','unassigned','due_soon','overdue','review','reopened','comment','reply','mention','status'));
alter table public.task_notifications add column comment_id uuid references public.task_comments(id) on delete restrict;

create function public.task_is_member(p_id uuid,p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path='' as $$
 select public.task_role() is not null and exists(select 1 from public.tasks t where t.id=p_id and t.deleted_at is null
 and (t.assigned_to=p_user or exists(select 1 from public.task_members m where m.task_id=t.id and m.user_id=p_user)))
$$;
create function public.task_can_complete_step(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.task_can_edit(p_id) or (public.task_is_member(p_id) and exists(select 1 from public.tasks t
 where t.id=p_id and t.archived_at is null and t.deleted_at is null and t.status not in ('completed','cancelled')))
$$;
-- Audience accounts promoted to editor may have display_name rather than
-- full_name; never fall back to exposing their email address.
create or replace function public.task_team() returns table(user_id uuid,role text,display_name text)
language sql stable security definer set search_path='' as $$
 select e.user_id,e.role,coalesce(nullif(left(u.raw_user_meta_data->>'full_name',120),''),nullif(left(u.raw_user_meta_data->>'display_name',120),''),'عضو الفريق')
 from public.editors e join auth.users u on u.id=e.user_id where public.task_role() is not null and e.role in ('admin','management') order by e.added_at,e.user_id
$$;
alter table public.task_members enable row level security;
create policy task_members_read on public.task_members for select to authenticated using(public.task_visible(task_id));
create policy task_members_insert on public.task_members for insert to authenticated with check(public.task_role()='management' and public.task_visible(task_id));
create policy task_members_delete on public.task_members for delete to authenticated using(public.task_role()='management' and public.task_visible(task_id));
revoke all on public.task_members from public,anon,authenticated;
grant select,insert,delete on public.task_members to authenticated;
drop policy task_subtasks_update on public.task_subtasks;
create policy task_subtasks_update on public.task_subtasks for update to authenticated
 using(public.task_can_complete_step(task_id)) with check(public.task_can_complete_step(task_id));
-- Replies retain a tombstone; clients cannot orphan a thread by physical deletion.
drop policy task_comments_delete on public.task_comments;
revoke delete on public.task_comments from authenticated;

create function public.task_member_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare t public.tasks; copied boolean:=false;
begin
 select * into t from public.tasks where id=case when tg_op='DELETE' then old.task_id else new.task_id end for update;
 if tg_op='INSERT' and pg_trigger_depth()>1 and t.recurrence_of is not null then
  copied:=exists(select 1 from public.task_members m where m.task_id=t.recurrence_of and m.user_id=new.user_id);
 end if;
 if not copied and (public.task_role() is distinct from 'management' or t.deleted_at is not null) then
  raise exception 'Management required' using errcode='42501';
 end if;
 if tg_op='INSERT' then
  if new.user_id=t.assigned_to or not exists(select 1 from public.editors e where e.user_id=new.user_id and e.role in ('admin','management')) then
   raise exception 'Invalid task participant' using errcode='23514'; end if;
  new.added_by:=auth.uid();new.created_at:=clock_timestamp();
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
create trigger task_member_guard before insert or delete on public.task_members for each row execute function public.task_member_guard();

create function public.task_member_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare tid uuid:=case when tg_op='DELETE' then old.task_id else new.task_id end;
 uid uuid:=case when tg_op='DELETE' then old.user_id else new.user_id end; t public.tasks;
begin
 -- The task guard still runs; recurrence inserts may be made by the primary.
 update public.tasks set title=title where id=tid returning * into t;
 insert into public.task_activity(task_id,actor_id,action,field,old_value,new_value)
 values(tid,auth.uid(),case when tg_op='INSERT' then 'member_added' else 'member_removed' end,'participant',
  case when tg_op='DELETE' then to_jsonb(uid) end,case when tg_op='INSERT' then to_jsonb(uid) end);
 if uid<>auth.uid() and (tg_op='INSERT' or uid<>t.assigned_to) then
  insert into public.task_notifications(user_id,task_id,kind,dedupe_key)
  values(uid,tid,case when tg_op='INSERT' then 'assignment' else 'unassigned' end,tid||':membership:'||t.revision||':'||lower(tg_op)) on conflict do nothing;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
create trigger task_member_audit after insert or delete on public.task_members for each row execute function public.task_member_audit();

-- Preserve the original task guard including review, identities and recurrence.
-- The only extra update allowed to a collaborator is an unchanged task touch
-- made by a definer helper/trigger; task UPDATE RLS is not widened.
create or replace function public.task_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare r text:=public.task_role();v text;touch_only boolean:=false;
begin
 if r is null then raise exception 'Editor required' using errcode='42501'; end if;
 if tg_op='UPDATE' then touch_only:=public.task_is_member(old.id) and
  (to_jsonb(new)-array['revision','updated_at'])=(to_jsonb(old)-array['revision','updated_at']); end if;
 if tg_op='INSERT' then
  if new.created_by is distinct from auth.uid() or (r<>'management' and new.assigned_to is distinct from auth.uid())
   or new.archived_at is not null or new.deleted_at is not null or (new.recurrence_of is not null and pg_trigger_depth()<2)
  then raise exception 'Invalid task ownership' using errcode='42501';end if;
  new.created_at:=clock_timestamp();new.revision:=1;
 else
  if old.deleted_at is not null or (r<>'management' and old.assigned_to is distinct from auth.uid() and not touch_only) then raise exception 'Task edit denied' using errcode='42501';end if;
  if new.id<>old.id or new.created_by<>old.created_by or new.created_at<>old.created_at or new.recurrence_of is distinct from old.recurrence_of then raise exception 'Immutable task field' using errcode='42501';end if;
  if r<>'management' and (new.assigned_to<>old.assigned_to or new.requires_review<>old.requires_review or new.deleted_at is distinct from old.deleted_at) then raise exception 'Management required' using errcode='42501';end if;
  if new.deleted_at is distinct from old.deleted_at then new.deleted_at:=clock_timestamp();end if;new.revision:=old.revision+1;
 end if;
 if tg_op='INSERT' or new.assigned_to is distinct from old.assigned_to then
  if not exists(select 1 from public.editors where user_id=new.assigned_to and role in ('admin','management')) then raise exception 'Assignee is not an editor' using errcode='23514';end if;
 end if;
 if new.project_id is not null and (tg_op='INSERT' or new.project_id is distinct from old.project_id) and not exists(select 1 from public.task_projects where id=new.project_id and is_active)
  and not(tg_op='INSERT' and pg_trigger_depth()>1 and new.recurrence_of is not null and exists(select 1 from public.tasks where id=new.recurrence_of and project_id=new.project_id)) then raise exception 'Inactive project' using errcode='23514';end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.due_timezone) then raise exception 'Invalid timezone' using errcode='23514';end if;
 if new.start_at>=public.task_deadline(new.due_at,new.due_date,new.due_timezone) then raise exception 'Start follows deadline' using errcode='23514';end if;
 foreach v in array new.tags loop if v is null or length(btrim(v)) not between 1 and 60 then raise exception 'Invalid tag' using errcode='23514';end if;end loop;
 foreach v in array new.links loop if v is null or length(v)>2048 or v !~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$' then raise exception 'Invalid link' using errcode='23514';end if;end loop;
 if new.status='completed' then
  if tg_op='INSERT' or old.status<>'completed' then
   if new.requires_review and r<>'management' then raise exception 'Review approval required' using errcode='42501';end if;
   new.completed_at:=clock_timestamp();new.completed_by:=auth.uid();
  else new.completed_at:=old.completed_at;new.completed_by:=old.completed_by;end if;
 else new.completed_at:=null;new.completed_by:=null;end if;
 if new.archived_at is not null then
  if new.status<>'completed' then raise exception 'Only completed tasks can be archived' using errcode='23514';end if;
  if tg_op='INSERT' or old.archived_at is null then new.archived_at:=clock_timestamp();else new.archived_at:=old.archived_at;end if;
 end if;
 new.updated_at:=clock_timestamp();return new;
end $$;

create function public.task_collaboration_copy() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.recurrence_of is not null then
  insert into public.task_members(task_id,user_id) select new.id,m.user_id from public.task_members m
  join public.editors e on e.user_id=m.user_id and e.role in ('admin','management')
  where m.task_id=new.recurrence_of and m.user_id<>new.assigned_to on conflict do nothing;
 end if;return new;
end $$;
create trigger task_collaboration_copy after insert on public.tasks for each row execute function public.task_collaboration_copy();
create function public.task_collaboration_primary() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.assigned_to is distinct from old.assigned_to then delete from public.task_members where task_id=new.id and user_id=new.assigned_to;end if;
 return new;
end $$;
create trigger task_collaboration_primary after update on public.tasks for each row execute function public.task_collaboration_primary();

create or replace function public.task_child_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare tid uuid;r text:=public.task_role();uid uuid;
begin
 tid:=case when tg_op='DELETE' then old.task_id else new.task_id end;
 perform 1 from public.tasks where id=tid for update;
 if r is null or not public.task_visible(tid) then raise exception 'Editor required' using errcode='42501';end if;
 if tg_op='UPDATE' and (new.task_id<>old.task_id or new.id<>old.id or new.created_at<>old.created_at) then raise exception 'Immutable child field' using errcode='42501';end if;
 if tg_table_name='task_subtasks' then
  if not public.task_can_edit(tid) then
   if tg_op<>'UPDATE' or not public.task_can_complete_step(tid) then raise exception 'Task edit denied' using errcode='42501';end if;
   if (to_jsonb(new)-array['is_completed','completed_at'])<>(to_jsonb(old)-array['is_completed','completed_at']) then raise exception 'Only step completion allowed' using errcode='42501';end if;
  end if;
  if tg_op<>'DELETE' then
   if new.is_completed then if tg_op='INSERT' or not old.is_completed then new.completed_at:=clock_timestamp();else new.completed_at:=old.completed_at;end if;
   else new.completed_at:=null;end if;
  end if;
 else
  if tg_op='DELETE' then raise exception 'Use comment tombstone' using errcode='42501';end if;
  if tg_op='INSERT' then
   if new.author_id<>auth.uid() or new.deleted_at is not null then raise exception 'Invalid author' using errcode='42501';end if;
   if new.parent_id is not null and not exists(select 1 from public.task_comments where id=new.parent_id and task_id=tid and deleted_at is null) then raise exception 'Reply parent unavailable' using errcode='23514';end if;
   new.created_at:=clock_timestamp();new.updated_at:=new.created_at;new.edited_at:=null;new.revision:=1;
  else
   if old.author_id<>auth.uid() and r<>'management' or old.deleted_at is not null then raise exception 'Comment edit denied' using errcode='42501';end if;
   if current_setting('app967.task_comment_revision',true) is distinct from old.id::text||':'||old.revision then raise exception 'Comment changed; reload' using errcode='40001';end if;
   perform set_config('app967.task_comment_revision','',true);
   if new.author_id<>old.author_id or new.parent_id is distinct from old.parent_id then raise exception 'Immutable comment ancestry' using errcode='42501';end if;
   new.updated_at:=clock_timestamp();new.edited_at:=new.updated_at;new.revision:=old.revision+1;
   if new.deleted_at is not null then new.deleted_at:=clock_timestamp();new.body:='تم حذف هذا التعليق';new.mention_ids:='{}';end if;
  end if;
  if cardinality(new.mention_ids)<>(select count(distinct x) from unnest(new.mention_ids)x) then raise exception 'Duplicate mention' using errcode='23514';end if;
  foreach uid in array new.mention_ids loop
   if uid is null or not exists(select 1 from public.editors where user_id=uid and role in ('admin','management')) then raise exception 'Invalid mention' using errcode='23514';end if;
  end loop;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;

create or replace function public.task_child_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare tid uuid:=case when tg_op='DELETE' then old.task_id else new.task_id end;
 kind text:=case when tg_table_name='task_comments' then 'comment' else 'subtask' end;parent_author uuid;uid uuid;action text;
begin
 action:=kind||'_'||lower(tg_op);
 if tg_table_name='task_comments' then
  if tg_op='UPDATE' and new.deleted_at is not null then action:='comment_delete';end if;
 end if;
 insert into public.task_activity(task_id,actor_id,action,old_value,new_value) values(tid,auth.uid(),action,
  case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end);
 if tg_table_name='task_comments' then
 if new.deleted_at is null then
  if new.parent_id is not null then select author_id into parent_author from public.task_comments where id=new.parent_id;end if;
  if tg_op='INSERT' and parent_author is not null and parent_author<>auth.uid() then
   insert into public.task_notifications(user_id,task_id,comment_id,kind,dedupe_key)
   values(parent_author,tid,new.id,'reply','reply:'||new.id) on conflict do nothing;
  end if;
  foreach uid in array new.mention_ids loop
   if uid<>auth.uid() and uid is distinct from parent_author and (tg_op='INSERT' or not(uid=any(old.mention_ids))) then
    insert into public.task_notifications(user_id,task_id,comment_id,kind,dedupe_key)
    values(uid,tid,new.id,'mention','mention:'||new.id||':'||uid) on conflict do nothing;
   end if;
  end loop;
  if tg_op='INSERT' then
   -- One rolling notification per recipient/task/day, not one per message.
   insert into public.task_notifications(user_id,task_id,comment_id,kind,dedupe_key)
   select distinct recipient,tid,new.id,'comment',tid||':discussion:'||(clock_timestamp() at time zone 'UTC')::date
   from public.tasks t cross join lateral unnest(array[t.assigned_to,t.created_by]||array(select user_id from public.task_members where task_id=tid)) recipient
   join public.editors e on e.user_id=recipient and e.role in ('admin','management')
   where t.id=tid and recipient<>auth.uid() and recipient is distinct from parent_author and not(recipient=any(new.mention_ids))
   on conflict(user_id,dedupe_key) do update set created_at=excluded.created_at,comment_id=excluded.comment_id,read_at=null;
  end if;
 end if;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;

-- Add a notification companion, retaining task_audit's immutable history and
-- original recurrence implementation. Self-notifications are removed below.
create function public.task_collaboration_status() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.task_notifications where task_id=new.id and user_id=auth.uid() and
  dedupe_key in(new.id||':assignment:'||new.revision,new.id||':reopened:'||new.revision,new.id||':review:'||new.revision);
 if tg_op='UPDATE' and new.status is distinct from old.status then
  insert into public.task_notifications(user_id,task_id,kind,dedupe_key)
  select distinct recipient,new.id,'status',new.id||':status:'||new.revision
  from unnest(array[new.assigned_to,new.created_by]||array(select user_id from public.task_members where task_id=new.id)) recipient
  join public.editors e on e.user_id=recipient and e.role in ('admin','management')
  where recipient<>auth.uid() and not(new.status='in_review' and e.role='management')
  and not(old.status='completed' and recipient=new.assigned_to)
  on conflict do nothing;
 end if;return new;
end $$;
create trigger task_collaboration_status after insert or update on public.tasks for each row execute function public.task_collaboration_status();

create or replace function public.task_refresh_reminders() returns void language plpgsql security definer set search_path='' as $$
begin
 if public.task_role() is null then raise exception 'Editor required' using errcode='42501';end if;
 insert into public.task_notifications(user_id,task_id,kind,dedupe_key)
 select auth.uid(),t.id,case when public.task_deadline(due_at,due_date,due_timezone)<=now() then 'overdue' else 'due_soon' end,
 t.id||':'||case when public.task_deadline(due_at,due_date,due_timezone)<=now() then 'overdue' else 'due_soon' end||':'||coalesce(due_at::text,due_date::text)||':'||due_timezone
 from public.tasks t where public.task_is_member(t.id) and archived_at is null and deleted_at is null and status not in ('completed','cancelled')
 and public.task_deadline(due_at,due_date,due_timezone)<=now()+interval '24 hours' on conflict do nothing;
end $$;

create function public.task_complete_step(p_task uuid,p_revision bigint,p_step uuid,p_completed boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform public.task_lock(p_task,p_revision);
 if not public.task_can_complete_step(p_task) then raise exception 'Task edit denied' using errcode='42501';end if;
 if p_completed is null then raise exception 'Completion required' using errcode='22023';end if;
 update public.task_subtasks set is_completed=p_completed where id=p_step and task_id=p_task;
 if not found then raise exception 'Subtask not found' using errcode='P0002';end if;
 update public.tasks set title=title where id=p_task;
end $$;

alter function public.task_mutate(text,uuid,bigint,jsonb) rename to task_mutate_legacy;
-- The wrapper retains SECURITY INVOKER, existing table grants and old actions.
create function public.task_mutate(p_action text,p_id uuid default null,p_revision bigint default null,p_data jsonb default '{}')
returns jsonb language plpgsql set search_path='' as $$
declare t public.tasks;result jsonb;cid uuid;members uuid[];uid uuid;target_status text;had_members boolean:=p_data?'participant_ids';
begin
 if public.task_role() is null then raise exception 'Editor required' using errcode='42501';end if;
 if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Invalid data' using errcode='22023';end if;
 if had_members then
  if public.task_role()<>'management' then raise exception 'Management required' using errcode='42501';end if;
  if jsonb_typeof(p_data->'participant_ids') is distinct from 'array' or jsonb_array_length(p_data->'participant_ids')>50 then raise exception 'Invalid participants' using errcode='22023';end if;
  members:=array(select jsonb_array_elements_text(p_data->'participant_ids')::uuid);
  if cardinality(members)<>(select count(distinct x) from unnest(members)x) then raise exception 'Duplicate participants' using errcode='23514';end if;
 end if;
 if p_action in ('comment_save','comment_delete') then
  t:=public.task_lock(p_id,p_revision);cid:=(p_data->>'id')::uuid;
  if cid is null then
   if p_action='comment_delete' then raise exception 'Comment not found' using errcode='P0002';end if;
   insert into public.task_comments(task_id,body,parent_id,mention_ids) values(p_id,p_data->>'body',(p_data->>'parent_id')::uuid,
    coalesce(array(select jsonb_array_elements_text(p_data->'mention_ids')::uuid),'{}')) returning id into cid;
  else
   if p_data->>'comment_revision' is null or not exists(select 1 from public.task_comments where id=cid and task_id=p_id and revision=(p_data->>'comment_revision')::bigint) then raise exception 'Comment changed; reload' using errcode='40001';end if;
   perform set_config('app967.task_comment_revision',cid::text||':'||(p_data->>'comment_revision'),true);
   if p_action='comment_delete' then update public.task_comments set deleted_at=clock_timestamp() where id=cid and task_id=p_id;
   else update public.task_comments set body=p_data->>'body',mention_ids=coalesce(array(select jsonb_array_elements_text(p_data->'mention_ids')::uuid),'{}') where id=cid and task_id=p_id;end if;
   if not found then raise exception 'Comment edit denied' using errcode='42501';end if;
  end if;
  return jsonb_build_object('id',p_id,'comment_id',cid);
 end if;
 if p_action='subtask_complete' then perform public.task_complete_step(p_id,p_revision,(p_data->>'id')::uuid,(p_data->>'is_completed')::boolean);return jsonb_build_object('id',p_id);end if;
 if p_action='members' then
  if not had_members then raise exception 'Participants required' using errcode='22023';end if;
  t:=public.task_lock(p_id,p_revision);result:=jsonb_build_object('id',p_id);
 elsif p_action in ('create','update') and had_members then
  -- Apply completion last, so recurrence copies this transaction's membership.
  target_status:=p_data->>'status';
  if p_action='update' then t:=public.task_lock(p_id,p_revision);end if;
  result:=public.task_mutate_legacy(p_action,p_id,p_revision,(p_data-'participant_ids'-'status')||case when p_action='create' then jsonb_build_object('status','not_started') else '{}'::jsonb end);
  select * into t from public.tasks where id=(result->>'id')::uuid;
 else return public.task_mutate_legacy(p_action,p_id,p_revision,p_data);end if;
 foreach uid in array members loop
  if uid is null or uid=t.assigned_to or not exists(select 1 from public.task_team() e where e.user_id=uid) then raise exception 'Invalid participant' using errcode='23514';end if;
 end loop;
 delete from public.task_members where task_id=t.id and not(user_id=any(members));
 insert into public.task_members(task_id,user_id) select t.id,x from unnest(members)x on conflict do nothing;
 if target_status is not null then
  select * into t from public.tasks where id=t.id;
  perform public.task_mutate_legacy('status',t.id,t.revision,jsonb_build_object('status',target_status));
 end if;return result;
end $$;

revoke all on function public.task_is_member(uuid,uuid),public.task_can_complete_step(uuid),public.task_member_guard(),public.task_member_audit(),
 public.task_collaboration_copy(),public.task_collaboration_primary(),public.task_collaboration_status(),public.task_complete_step(uuid,bigint,uuid,boolean),public.task_mutate(text,uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.task_is_member(uuid,uuid),public.task_can_complete_step(uuid),public.task_complete_step(uuid,bigint,uuid,boolean),public.task_mutate(text,uuid,bigint,jsonb) to authenticated;
comment on table public.task_members is 'Additional collaborators only; tasks.assigned_to remains the one primary. Existing rows require no backfill.';
comment on column public.task_comments.parent_id is 'Immutable same-task parent. Replies retain their place beneath deleted-comment tombstones.';
commit;
