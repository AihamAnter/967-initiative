-- 967 task center. Review and apply separately; never automatically run on production.
-- Prerequisite: existing schema.sql + admin-roles.sql. Does not alter either.
begin;

create table public.task_projects (
 id uuid primary key default gen_random_uuid(),
 name text not null unique check (length(btrim(name)) between 1 and 120),
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(btrim(title)) between 1 and 250),
 description text not null default '' check (length(description)<=15000),
 notes text not null default '' check (length(notes)<=10000),
 project_id uuid references public.task_projects(id) on delete restrict,
 created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
 assigned_to uuid not null default auth.uid() references auth.users(id) on delete restrict,
 status text not null default 'not_started' check (status in ('not_started','in_progress','in_review','blocked','completed','cancelled')),
 priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
 start_at timestamptz check(start_at between '1900-01-01'::timestamptz and '9999-12-31'::timestamptz),
 due_at timestamptz check(due_at between '1900-01-01'::timestamptz and '9999-12-31'::timestamptz),
 due_date date check(due_date between '1900-01-01'::date and '9999-12-31'::date),
 due_timezone text not null default 'UTC',
 estimated_minutes integer check (estimated_minutes between 1 and 525600),
 tags text[] not null default '{}' check (cardinality(tags)<=20),
 links text[] not null default '{}' check (cardinality(links)<=20),
 requires_review boolean not null default false,
 recurrence text not null default 'none' check (recurrence in ('none','daily','weekly','monthly')),
 recurrence_of uuid unique references public.tasks(id) on delete restrict,
 completed_at timestamptz,
 completed_by uuid references auth.users(id) on delete restrict,
 archived_at timestamptz,
 deleted_at timestamptz,
 revision bigint not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (due_at is null or due_date is null),
 check ((status='completed' and completed_at is not null and completed_by is not null)
     or (status<>'completed' and completed_at is null and completed_by is null))
);
create table public.task_subtasks (
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.tasks(id) on delete restrict,
 title text not null check (length(btrim(title)) between 1 and 250),
 position integer not null default 0 check (position between 0 and 100000),
 is_completed boolean not null default false,
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 check (is_completed = (completed_at is not null))
);
create table public.task_comments (
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.tasks(id) on delete restrict,
 author_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
 body text not null check (length(btrim(body)) between 1 and 5000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 edited_at timestamptz
);
create table public.task_activity (
 id bigint generated always as identity primary key,
 task_id uuid references public.tasks(id) on delete restrict,
 actor_id uuid references auth.users(id) on delete restrict,
 action text not null,
 field text,
 old_value jsonb,
 new_value jsonb,
 created_at timestamptz not null default now()
);
create table public.task_notifications (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 task_id uuid not null references public.tasks(id) on delete restrict,
 kind text not null check (kind in ('assignment','due_soon','overdue','review','reopened','comment')),
 dedupe_key text not null,
 read_at timestamptz,
 created_at timestamptz not null default now(),
 unique (user_id,dedupe_key)
);
create index tasks_assignee_idx on public.tasks(assigned_to,status) where deleted_at is null;
create index tasks_due_idx on public.tasks(due_at,due_date) where archived_at is null and deleted_at is null;
create index tasks_project_idx on public.tasks(project_id);
create index tasks_updated_idx on public.tasks(updated_at desc,id);
create index task_subtasks_parent_idx on public.task_subtasks(task_id,position,id);
create index task_comments_parent_idx on public.task_comments(task_id,created_at,id);
create index task_activity_parent_idx on public.task_activity(task_id,created_at desc,id);
create index task_notifications_user_idx on public.task_notifications(user_id,created_at desc);

-- Narrow helpers do not expose Auth records or modify existing editor policies.
create function public.task_role() returns text language sql stable security definer set search_path=''
as $$ select role from public.editors where user_id=(select auth.uid()) and role in ('admin','management') $$;
create function public.task_can_edit(p_id uuid) returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.tasks t where t.id=p_id and t.deleted_at is null and
 (public.task_role()='management' or (public.task_role()='admin' and t.assigned_to=(select auth.uid())))) $$;
create function public.task_visible(p_id uuid) returns boolean language sql stable security definer set search_path=''
as $$ select public.task_role() is not null and exists(select 1 from public.tasks where id=p_id and deleted_at is null) $$;
create function public.task_deadline(p_due_at timestamptz,p_due_date date,p_zone text) returns timestamptz
language sql stable set search_path='' as $$ select coalesce(p_due_at,((p_due_date+1)::timestamp at time zone p_zone)) $$;

alter table public.tasks enable row level security;
alter table public.task_projects enable row level security;
alter table public.task_subtasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_activity enable row level security;
alter table public.task_notifications enable row level security;
create policy tasks_read on public.tasks for select to authenticated using (public.task_role() is not null and deleted_at is null);
create policy tasks_create on public.tasks for insert to authenticated with check (public.task_role() is not null and created_by=(select auth.uid()) and (public.task_role()='management' or assigned_to=(select auth.uid())));
create policy tasks_update on public.tasks for update to authenticated using (public.task_can_edit(id)) with check (public.task_role()='management' or assigned_to=(select auth.uid()));
create policy task_projects_read on public.task_projects for select to authenticated using (public.task_role() is not null);
create policy task_projects_create on public.task_projects for insert to authenticated with check (public.task_role()='management');
create policy task_projects_update on public.task_projects for update to authenticated using (public.task_role()='management') with check (public.task_role()='management');
create policy task_subtasks_read on public.task_subtasks for select to authenticated using (public.task_visible(task_id));
create policy task_subtasks_create on public.task_subtasks for insert to authenticated with check (public.task_can_edit(task_id));
create policy task_subtasks_update on public.task_subtasks for update to authenticated using (public.task_can_edit(task_id)) with check (public.task_can_edit(task_id));
create policy task_subtasks_delete on public.task_subtasks for delete to authenticated using (public.task_can_edit(task_id));
create policy task_comments_read on public.task_comments for select to authenticated using (public.task_visible(task_id));
create policy task_comments_create on public.task_comments for insert to authenticated with check (public.task_visible(task_id) and author_id=(select auth.uid()));
create policy task_comments_update on public.task_comments for update to authenticated using (public.task_visible(task_id) and (author_id=(select auth.uid()) or public.task_role()='management')) with check (public.task_visible(task_id) and (author_id=(select auth.uid()) or public.task_role()='management'));
create policy task_comments_delete on public.task_comments for delete to authenticated using (public.task_visible(task_id) and (author_id=(select auth.uid()) or public.task_role()='management'));
-- Audit remains readable after logical deletion; it is append-only to application roles.
create policy task_activity_read on public.task_activity for select to authenticated using (public.task_role() is not null);
create policy task_notifications_read on public.task_notifications for select to authenticated using (public.task_role() is not null and user_id=(select auth.uid()));
create policy task_notifications_update on public.task_notifications for update to authenticated using (public.task_role() is not null and user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

revoke all on public.tasks,public.task_projects,public.task_subtasks,public.task_comments,public.task_activity,public.task_notifications from anon,authenticated;
grant select on public.tasks to authenticated;
grant insert(title,description,notes,project_id,assigned_to,status,priority,start_at,due_at,due_date,due_timezone,estimated_minutes,tags,links,requires_review,recurrence) on public.tasks to authenticated;
grant update(title,description,notes,project_id,assigned_to,status,priority,start_at,due_at,due_date,due_timezone,estimated_minutes,tags,links,requires_review,recurrence,archived_at) on public.tasks to authenticated;
grant select,insert,update on public.task_projects to authenticated;
grant select,insert,update,delete on public.task_subtasks,public.task_comments to authenticated;
grant select on public.task_activity,public.task_notifications to authenticated;
grant update(read_at) on public.task_notifications to authenticated;

create function public.task_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare r text:=public.task_role(); v text;
begin
 if r is null then raise exception 'Editor required' using errcode='42501'; end if;
 if tg_op='INSERT' then
  if new.created_by is distinct from auth.uid() or (r<>'management' and new.assigned_to is distinct from auth.uid())
   or new.archived_at is not null or new.deleted_at is not null or (new.recurrence_of is not null and pg_trigger_depth()<2)
  then raise exception 'Invalid task ownership' using errcode='42501'; end if;
  new.created_at:=clock_timestamp(); new.revision:=1;
 else
  if old.deleted_at is not null or (r<>'management' and old.assigned_to is distinct from auth.uid()) then raise exception 'Task edit denied' using errcode='42501'; end if;
  if new.id<>old.id or new.created_by<>old.created_by or new.created_at<>old.created_at or new.recurrence_of is distinct from old.recurrence_of then raise exception 'Immutable task field' using errcode='42501'; end if;
  if r<>'management' and (new.assigned_to<>old.assigned_to or new.requires_review<>old.requires_review or new.deleted_at is distinct from old.deleted_at) then raise exception 'Management required' using errcode='42501'; end if;
  if new.deleted_at is distinct from old.deleted_at then new.deleted_at:=clock_timestamp(); end if;
  new.revision:=old.revision+1;
 end if;
 if tg_op='INSERT' or new.assigned_to is distinct from old.assigned_to then
  if not exists(select 1 from public.editors where user_id=new.assigned_to and role in ('admin','management')) then raise exception 'Assignee is not an editor' using errcode='23514'; end if;
 end if;
 if new.project_id is not null and (tg_op='INSERT' or new.project_id is distinct from old.project_id) and not exists(select 1 from public.task_projects where id=new.project_id and is_active)
  and not (tg_op='INSERT' and pg_trigger_depth()>1 and new.recurrence_of is not null and exists(select 1 from public.tasks where id=new.recurrence_of and project_id=new.project_id))
 then raise exception 'Inactive project' using errcode='23514'; end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.due_timezone) then raise exception 'Invalid timezone' using errcode='23514'; end if;
 if new.start_at>=public.task_deadline(new.due_at,new.due_date,new.due_timezone) then raise exception 'Start follows deadline' using errcode='23514'; end if;
 foreach v in array new.tags loop if v is null or length(btrim(v)) not between 1 and 60 then raise exception 'Invalid tag' using errcode='23514'; end if; end loop;
 foreach v in array new.links loop if v is null or length(v)>2048 or v !~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$' then raise exception 'Invalid link' using errcode='23514'; end if; end loop;
 if new.status='completed' then
  if (tg_op='INSERT' or old.status<>'completed') then
   if new.requires_review and r<>'management' then raise exception 'Review approval required' using errcode='42501'; end if;
   new.completed_at:=clock_timestamp(); new.completed_by:=auth.uid();
  else new.completed_at:=old.completed_at; new.completed_by:=old.completed_by; end if;
 else new.completed_at:=null; new.completed_by:=null; end if;
 if new.archived_at is not null then
  if new.status<>'completed' then raise exception 'Only completed tasks can be archived' using errcode='23514'; end if;
  if tg_op='INSERT' or old.archived_at is null then new.archived_at:=clock_timestamp(); else new.archived_at:=old.archived_at; end if;
 end if;
 new.updated_at:=clock_timestamp();
 return new;
end $$;
create trigger task_guard before insert or update on public.tasks for each row execute function public.task_guard();

create function public.task_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare k text; a text; recipient uuid; next_id uuid; step interval;
begin
 if tg_op='INSERT' then
  insert into public.task_activity(task_id,actor_id,action,new_value) values(new.id,auth.uid(),'created',jsonb_build_object('title',new.title));
 else
  for k in select key from jsonb_each(to_jsonb(new)-array['updated_at','revision']) loop
   if to_jsonb(old)->k is distinct from to_jsonb(new)->k then
    a:=case when k='status' and new.status='completed' then 'completed' when k='status' and old.status='completed' then 'reopened' when k='archived_at' and new.archived_at is not null then 'archived' when k='archived_at' then 'restored' when k='deleted_at' then 'deleted' else 'updated' end;
    insert into public.task_activity(task_id,actor_id,action,field,old_value,new_value) values(new.id,auth.uid(),a,k,to_jsonb(old)->k,to_jsonb(new)->k);
   end if;
  end loop;
 end if;
 if tg_op='INSERT' or new.assigned_to is distinct from old.assigned_to then
  insert into public.task_notifications(user_id,task_id,kind,dedupe_key) values(new.assigned_to,new.id,'assignment',new.id||':assignment:'||new.revision) on conflict do nothing;
 end if;
 if tg_op='UPDATE' and old.status='completed' and new.status<>'completed' then
  insert into public.task_notifications(user_id,task_id,kind,dedupe_key) values(new.assigned_to,new.id,'reopened',new.id||':reopened:'||new.revision) on conflict do nothing;
 end if;
 if new.status='in_review' and (tg_op='INSERT' or old.status<>'in_review') then
  insert into public.task_notifications(user_id,task_id,kind,dedupe_key)
   select user_id,new.id,'review',new.id||':review:'||new.revision from public.editors where role='management' on conflict do nothing;
 end if;
 -- Row update lock + UNIQUE(recurrence_of) make completion/retries/reopening idempotent.
 if new.status='completed' and new.recurrence<>'none' and (tg_op='INSERT' or old.status<>'completed') then
  step:=case new.recurrence when 'daily' then interval '1 day' when 'weekly' then interval '7 days' else interval '1 month' end;
  insert into public.tasks(title,description,notes,project_id,created_by,assigned_to,priority,start_at,due_at,due_date,due_timezone,estimated_minutes,tags,links,requires_review,recurrence,recurrence_of)
   values(new.title,new.description,new.notes,new.project_id,auth.uid(),new.assigned_to,new.priority,
    case when new.start_at is null then null else ((new.start_at at time zone new.due_timezone)+step) at time zone new.due_timezone end,
    case when new.due_at is null then null else ((new.due_at at time zone new.due_timezone)+step) at time zone new.due_timezone end,
    (new.due_date+step)::date,new.due_timezone,new.estimated_minutes,new.tags,new.links,new.requires_review,new.recurrence,new.id)
   on conflict(recurrence_of) do nothing returning id into next_id;
  if next_id is not null then
   insert into public.task_subtasks(task_id,title,position) select next_id,title,position from public.task_subtasks where task_id=new.id;
  end if;
 end if;
 return new;
end $$;
create trigger task_audit after insert or update on public.tasks for each row execute function public.task_audit();

create function public.task_child_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare parent_id uuid; old_json jsonb; new_json jsonb; r text:=public.task_role();
begin
 parent_id:=case when tg_op='DELETE' then old.task_id else new.task_id end;
 -- Serialize direct child writes with completion, deletion and recurrence copying.
 perform 1 from public.tasks where id=parent_id for update;
 if r is null or not public.task_visible(parent_id) then raise exception 'Editor required' using errcode='42501'; end if;
 if tg_op<>'INSERT' and tg_op<>'DELETE' and (new.task_id<>old.task_id or new.id<>old.id or new.created_at<>old.created_at) then raise exception 'Immutable child field' using errcode='42501'; end if;
 if tg_table_name='task_subtasks' then
  if not public.task_can_edit(parent_id) then raise exception 'Task edit denied' using errcode='42501'; end if;
  if tg_op<>'DELETE' then
   if new.is_completed then
    if tg_op='INSERT' or not old.is_completed then new.completed_at:=clock_timestamp(); else new.completed_at:=old.completed_at; end if;
   else new.completed_at:=null; end if;
  end if;
 else
  if tg_op='INSERT' then
   if new.author_id<>auth.uid() then raise exception 'Invalid author' using errcode='42501'; end if;
   new.created_at:=clock_timestamp(); new.updated_at:=new.created_at; new.edited_at:=null;
  else
   if old.author_id<>auth.uid() and r<>'management' then raise exception 'Comment edit denied' using errcode='42501'; end if;
   if tg_op='UPDATE' then
    if new.author_id<>old.author_id then raise exception 'Immutable author' using errcode='42501'; end if;
    new.updated_at:=clock_timestamp(); new.edited_at:=new.updated_at;
   end if;
  end if;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
create trigger task_subtask_guard before insert or update or delete on public.task_subtasks for each row execute function public.task_child_guard();
create trigger task_comment_guard before insert or update or delete on public.task_comments for each row execute function public.task_child_guard();

create function public.task_child_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare parent_id uuid:=case when tg_op='DELETE' then old.task_id else new.task_id end; kind text:=case when tg_table_name='task_comments' then 'comment' else 'subtask' end;
begin
 insert into public.task_activity(task_id,actor_id,action,old_value,new_value) values(parent_id,auth.uid(),kind||'_'||lower(tg_op),case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end);
 if tg_table_name='task_comments' and tg_op='INSERT' then
  insert into public.task_notifications(user_id,task_id,kind,dedupe_key)
   select distinct recipient,parent_id,'comment','comment:'||new.id from public.tasks t cross join lateral unnest(array[t.assigned_to,t.created_by]) recipient where t.id=parent_id and recipient<>auth.uid() on conflict do nothing;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
create trigger task_subtask_audit after insert or update or delete on public.task_subtasks for each row execute function public.task_child_audit();
create trigger task_comment_audit after insert or update or delete on public.task_comments for each row execute function public.task_child_audit();

create function public.task_team() returns table(user_id uuid,role text,display_name text)
language sql stable security definer set search_path='' as $$
 select e.user_id,e.role,coalesce(nullif(left(u.raw_user_meta_data->>'full_name',120),''),'عضو الفريق')
 from public.editors e join auth.users u on u.id=e.user_id where public.task_role() is not null and e.role in ('admin','management') order by e.added_at,e.user_id
$$;

-- The only clock-based reminder path: called on opening/refreshing the center.
-- It intentionally does not claim to run while the site is closed.
create function public.task_refresh_reminders() returns void language plpgsql security definer set search_path='' as $$
begin
 if public.task_role() is null then raise exception 'Editor required' using errcode='42501'; end if;
 insert into public.task_notifications(user_id,task_id,kind,dedupe_key)
 select auth.uid(),id,case when public.task_deadline(due_at,due_date,due_timezone)<=now() then 'overdue' else 'due_soon' end,
 id||':'||case when public.task_deadline(due_at,due_date,due_timezone)<=now() then 'overdue' else 'due_soon' end||':'||coalesce(due_at::text,due_date::text)||':'||due_timezone
 from public.tasks where assigned_to=auth.uid() and archived_at is null and deleted_at is null and status not in ('completed','cancelled') and public.task_deadline(due_at,due_date,due_timezone)<=now()+interval '24 hours'
 on conflict do nothing;
end $$;

-- SELECT FOR UPDATE normally also requires the row's UPDATE policy. A narrow
-- definer helper permits team-wide comment locks without granting task edits.
create function public.task_lock(p_id uuid,p_revision bigint) returns public.tasks
language plpgsql security definer set search_path='' as $$
declare t public.tasks;
begin
 if public.task_role() is null then raise exception 'Editor required' using errcode='42501'; end if;
 select * into t from public.tasks where id=p_id and deleted_at is null for update;
 if not found then raise exception 'Task not found' using errcode='P0002'; end if;
 if p_revision is distinct from t.revision then raise exception 'Task changed; reload' using errcode='40001'; end if;
 return t;
end $$;
-- A soft delete makes the new row invisible to SELECT RLS. Keep this exception
-- narrow, management-only and revision-checked; the normal guard/audit still run.
create function public.task_soft_delete(p_id uuid,p_revision bigint) returns void
language plpgsql security definer set search_path='' as $$
begin
 if public.task_role()<>'management' or public.task_role() is null then raise exception 'Management required' using errcode='42501'; end if;
 perform public.task_lock(p_id,p_revision);
 update public.tasks set deleted_at=clock_timestamp() where id=p_id;
end $$;

-- SECURITY INVOKER deliberately retains the caller's RLS and table/column grants.
-- Every task mutation locks its parent and compares a monotonically increasing revision.
create function public.task_mutate(p_action text,p_id uuid default null,p_revision bigint default null,p_data jsonb default '{}')
returns jsonb language plpgsql set search_path='' as $$
declare t public.tasks; saved_id uuid; k text; child_id uuid; current_project public.task_projects;
begin
 if public.task_role() is null then raise exception 'Editor required' using errcode='42501'; end if;
 if p_action='project_save' then
  if public.task_role()<>'management' then raise exception 'Management required' using errcode='42501'; end if;
  if p_id is null then insert into public.task_projects(name) values(p_data->>'name') returning id into saved_id;
  else
   select * into current_project from public.task_projects where id=p_id for update;
   if not found then raise exception 'Project not found' using errcode='P0002'; end if;
   if (p_data->>'updated_at')::timestamptz is distinct from current_project.updated_at then raise exception 'Project changed' using errcode='40001'; end if;
   update public.task_projects set name=coalesce(p_data->>'name',name),is_active=coalesce((p_data->>'is_active')::boolean,is_active),updated_at=clock_timestamp() where id=p_id returning id into saved_id;
  end if;
  return jsonb_build_object('id',saved_id);
 end if;
 if p_action='create' then
  for k in select jsonb_object_keys(p_data) loop
   if k<>all(array['title','description','notes','project_id','assigned_to','status','priority','start_at','due_at','due_date','due_timezone','estimated_minutes','tags','links','requires_review','recurrence']) then raise exception 'Invalid task field' using errcode='22023'; end if;
  end loop;
  insert into public.tasks(title,description,notes,project_id,assigned_to,status,priority,start_at,due_at,due_date,due_timezone,estimated_minutes,tags,links,requires_review,recurrence)
  values(p_data->>'title',coalesce(p_data->>'description',''),coalesce(p_data->>'notes',''),(p_data->>'project_id')::uuid,coalesce((p_data->>'assigned_to')::uuid,auth.uid()),coalesce(p_data->>'status','not_started'),coalesce(p_data->>'priority','normal'),(p_data->>'start_at')::timestamptz,(p_data->>'due_at')::timestamptz,(p_data->>'due_date')::date,coalesce(p_data->>'due_timezone','UTC'),(p_data->>'estimated_minutes')::integer,coalesce(array(select jsonb_array_elements_text(p_data->'tags')),'{}'),coalesce(array(select jsonb_array_elements_text(p_data->'links')),'{}'),coalesce((p_data->>'requires_review')::boolean,false),coalesce(p_data->>'recurrence','none')) returning id into saved_id;
  return jsonb_build_object('id',saved_id);
 end if;
 t:=public.task_lock(p_id,p_revision);
 if p_action in ('comment_save','comment_delete') then
  child_id:=(p_data->>'id')::uuid;
  if p_action='comment_delete' then delete from public.task_comments where id=child_id and task_id=p_id;
  elsif child_id is null then insert into public.task_comments(task_id,body) values(p_id,p_data->>'body');
  else update public.task_comments set body=p_data->>'body' where id=child_id and task_id=p_id;
  end if;
  if not found then raise exception 'Comment edit denied or comment missing' using errcode='42501'; end if;
  return jsonb_build_object('id',p_id);
 end if;
 if not public.task_can_edit(p_id) then raise exception 'Task edit denied' using errcode='42501'; end if;
 case p_action
 when 'update' then
  for k in select jsonb_object_keys(p_data) loop
   if k<>all(array['title','description','notes','project_id','assigned_to','status','priority','start_at','due_at','due_date','due_timezone','estimated_minutes','tags','links','requires_review','recurrence']) then raise exception 'Invalid task field' using errcode='22023'; end if;
  end loop;
  -- Populate only explicitly allowed fields; trigger owns timestamps/identity/revision.
  t:=jsonb_populate_record(t,p_data);
  update public.tasks set title=t.title,description=t.description,notes=t.notes,project_id=t.project_id,assigned_to=t.assigned_to,status=t.status,priority=t.priority,start_at=t.start_at,due_at=t.due_at,due_date=t.due_date,due_timezone=t.due_timezone,estimated_minutes=t.estimated_minutes,tags=t.tags,links=t.links,requires_review=t.requires_review,recurrence=t.recurrence where id=p_id;
 when 'status' then update public.tasks set status=p_data->>'status',archived_at=case when p_data->>'status'<>'completed' then null else archived_at end where id=p_id;
 when 'archive' then update public.tasks set archived_at=clock_timestamp() where id=p_id;
 when 'restore' then update public.tasks set archived_at=null where id=p_id;
 when 'delete' then
  if public.task_role()<>'management' then raise exception 'Management required' using errcode='42501'; end if;
  perform public.task_soft_delete(p_id,p_revision);
 when 'subtask_save' then
  child_id:=(p_data->>'id')::uuid;
  if child_id is null then insert into public.task_subtasks(task_id,title,position) values(p_id,p_data->>'title',coalesce((p_data->>'position')::integer,0));
  else update public.task_subtasks set title=coalesce(p_data->>'title',title),position=coalesce((p_data->>'position')::integer,position),is_completed=coalesce((p_data->>'is_completed')::boolean,is_completed) where id=child_id and task_id=p_id;
  end if;
  if not found then raise exception 'Subtask not found' using errcode='P0002'; end if;
  update public.tasks set title=title where id=p_id;
 when 'subtask_delete' then
  delete from public.task_subtasks where id=(p_data->>'id')::uuid and task_id=p_id;
  if not found then raise exception 'Subtask not found' using errcode='P0002'; end if;
  update public.tasks set title=title where id=p_id;
 else raise exception 'Unknown action' using errcode='22023';
 end case;
 return jsonb_build_object('id',p_id);
end $$;

-- Trigger functions may only be called by their triggers; revoke default PUBLIC execute.
revoke all on function public.task_role(),public.task_can_edit(uuid),public.task_visible(uuid),public.task_deadline(timestamptz,date,text),public.task_guard(),public.task_audit(),public.task_child_guard(),public.task_child_audit(),public.task_team(),public.task_refresh_reminders(),public.task_lock(uuid,bigint),public.task_soft_delete(uuid,bigint),public.task_mutate(text,uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.task_role(),public.task_can_edit(uuid),public.task_visible(uuid),public.task_deadline(timestamptz,date,text),public.task_team(),public.task_refresh_reminders(),public.task_lock(uuid,bigint),public.task_soft_delete(uuid,bigint),public.task_mutate(text,uuid,bigint,jsonb) to authenticated;

insert into public.task_projects(name) values
 ('إدارة المنصة وتطويرها'),('مجلة 967'),('الإنتاج الإعلامي'),('برنامج يامكان'),('اليمن في دقيقة'),('اليمن بالأرقام'),('خريطة اليمن'),('ترتيب اليمن'),('دليل المنتجات اليمنية'),('دليل المهنيين'),('مناظرات 967'),('المبادرات والأنشطة المجتمعية'),('التواصل والعلاقات العامة'),('مهام إدارية عامة');
comment on table public.tasks is 'Internal 967 team tasks; both editor roles see the whole team; deleted_at retains audit tombstones.';
comment on column public.tasks.due_date is 'All-day date; deadline is exclusive next midnight in due_timezone. Mutually exclusive with due_at.';
comment on column public.tasks.recurrence_of is 'One successor per completed occurrence, generated atomically. Reopen/recomplete never generates another.';
commit;
