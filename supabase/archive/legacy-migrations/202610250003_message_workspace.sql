begin;
create table if not exists public.message_followups(
 message_id uuid primary key references public.messages(id) on delete cascade,
 assigned_to uuid references auth.users(id) on delete set null,
 notes text not null default '' check(length(notes)<=10000),
 task_id uuid references public.tasks(id) on delete set null,
 revision bigint not null default 1,
 updated_at timestamptz not null default clock_timestamp(),
 updated_by uuid references auth.users(id) on delete set null
);
alter table public.message_followups enable row level security;
revoke all on public.message_followups from anon,authenticated;
grant select on public.message_followups to authenticated;
create policy editor_message_followups on public.message_followups for select to authenticated
 using(exists(select 1 from public.editors where user_id=auth.uid() and role in ('admin','management')));

create or replace function public.editor_messages(p_filters jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; n integer; page_n integer:=greatest(1,least(100000,coalesce((p_filters->>'page')::int,1))); needle text:=left(coalesce(p_filters->>'q',''),150); types jsonb; members jsonb; zone_name text:=coalesce(p_filters->>'tz','UTC');
begin
 if not exists(select 1 from public.editors where user_id=auth.uid() and role in ('admin','management')) then raise exception 'Editor required' using errcode='42501'; end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=zone_name) then raise exception 'Invalid timezone' using errcode='22023'; end if;
 select coalesce(jsonb_agg(distinct type),'[]') into types from public.messages;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',e.user_id,'display_name',coalesce(nullif(u.raw_user_meta_data->>'full_name',''),'محرر'))),'[]') into members from public.editors e join auth.users u on u.id=e.user_id where e.role in ('admin','management');
 with filtered as (
 select m.*,f.assigned_to,f.notes as internal_notes,f.task_id,coalesce(f.revision,0) as followup_revision
 from public.messages m left join public.message_followups f on f.message_id=m.id
 where (needle='' or position(lower(needle) in lower(m.name||' '||m.email||' '||m.message))>0)
 and (coalesce(p_filters->>'status','') in ('','all') or m.status=p_filters->>'status')
 and (coalesce(p_filters->>'type','') in ('','all') or m.type=p_filters->>'type')
 and (coalesce(p_filters->>'assignee','') in ('','all') or f.assigned_to::text=p_filters->>'assignee')
 and (coalesce(p_filters->>'from','')='' or m.created_at>=((p_filters->>'from')::date::timestamp at time zone zone_name))
 and (coalesce(p_filters->>'to','')='' or m.created_at<(((p_filters->>'to')::date+interval '1 day') at time zone zone_name))
 ), numbered as (select *,count(*) over() as full_count from filtered)
 select coalesce(jsonb_agg(to_jsonb(row)-'full_count'),'[]'),coalesce(max(full_count),0) into result,n
 from (select * from numbered order by created_at desc,id desc offset (page_n-1)*20 limit 20) row;
 return jsonb_build_object('messages',result,'total',n,'page',page_n,'pages',greatest(1,ceil(n/20.0)),'types',types,'members',members);
end $$;

create or replace function public.editor_message_update(p_id uuid,p_revision bigint,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare entry public.messages; followup public.message_followups; actor uuid:=auth.uid(); role_name text; assignee uuid; linked jsonb; k text;
begin
 select role into role_name from public.editors where user_id=actor and role in ('admin','management');
 if role_name is null then raise exception 'Editor required' using errcode='42501'; end if;
 if jsonb_typeof(p_data)<>'object' then raise exception 'Invalid data' using errcode='22023'; end if;
 for k in select jsonb_object_keys(p_data) loop if k<>all(array['status','assigned_to','notes','create_task']) then raise exception 'Invalid field' using errcode='22023'; end if; end loop;
 select * into entry from public.messages where id=p_id for update;if not found then raise exception 'Message missing' using errcode='P0002'; end if;
 select * into followup from public.message_followups where message_id=p_id;
 if coalesce(followup.revision,0) is distinct from p_revision then raise exception 'Message changed' using errcode='40001'; end if;
 assignee:=case when p_data?'assigned_to' then nullif(p_data->>'assigned_to','')::uuid else followup.assigned_to end;
 if assignee is not null and not exists(select 1 from public.editors where user_id=assignee and role in ('admin','management')) then raise exception 'Invalid assignee' using errcode='22023'; end if;
 if p_data?'notes' and (jsonb_typeof(p_data->'notes')<>'string' or length(p_data->>'notes')>10000) then raise exception 'Invalid notes' using errcode='22023'; end if;
 if p_data?'status' and p_data->>'status' not in ('new','in_progress','resolved') then raise exception 'Invalid status' using errcode='22023'; end if;
 if coalesce((p_data->>'create_task')::boolean,false) and followup.task_id is null then
  linked:=public.task_mutate('create',null,null,jsonb_build_object('title',left('متابعة طلب: '||entry.type||' — '||entry.name,250),'description',left(entry.message,15000),'assigned_to',case when role_name='management' then coalesce(assignee,actor) else actor end));
  followup.task_id:=(linked->>'id')::uuid;
 end if;
 insert into public.message_followups(message_id,assigned_to,notes,task_id,updated_by)
 values(p_id,assignee,coalesce(p_data->>'notes',followup.notes,''),followup.task_id,actor)
 on conflict(message_id) do update set assigned_to=excluded.assigned_to,notes=excluded.notes,task_id=excluded.task_id,updated_by=actor,updated_at=clock_timestamp(),revision=message_followups.revision+1
 returning * into followup;
 if p_data?'status' then update public.messages set status=p_data->>'status' where id=p_id; end if;
 return to_jsonb(followup);
end $$;
revoke all on function public.editor_messages(jsonb),public.editor_message_update(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.editor_messages(jsonb),public.editor_message_update(uuid,bigint,jsonb) to authenticated;
commit;
