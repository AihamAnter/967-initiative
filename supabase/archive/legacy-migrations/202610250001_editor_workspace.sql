begin;
create table if not exists public.editor_drafts (
 owner_id uuid not null references auth.users(id) on delete cascade,
 draft_key text not null check(length(draft_key) between 1 and 160),
 kind text not null check(kind in ('issue','work','company','professional','figure','statistic','statistic_source','statistic_values','ranking','page','settings','governorate','district','message')),
 value jsonb not null check(jsonb_typeof(value)='object' and pg_column_size(value)<240000),
 revision bigint not null default 1,
 updated_at timestamptz not null default clock_timestamp(),
 primary key(owner_id,draft_key)
);
alter table public.editor_drafts enable row level security;
revoke all on public.editor_drafts from anon,authenticated;
grant select on public.editor_drafts to authenticated;
create policy editor_own_drafts on public.editor_drafts for select to authenticated
 using(owner_id=auth.uid() and exists(select 1 from public.editors where user_id=auth.uid() and role in ('admin','management')));
create or replace function public.editor_save_draft(p_kind text,p_key text,p_value jsonb,p_revision bigint default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare saved public.editor_drafts; actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.editors where user_id=actor and role in ('admin','management')) then raise exception 'Editor required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_key,0));
 select * into saved from public.editor_drafts where owner_id=actor and draft_key=p_key for update;
 if (saved.owner_id is null and p_revision is not null) or (saved.owner_id is not null and saved.revision is distinct from p_revision) then raise exception 'Draft changed' using errcode='40001'; end if;
 insert into public.editor_drafts(owner_id,draft_key,kind,value) values(actor,p_key,p_kind,p_value)
 on conflict(owner_id,draft_key) do update set kind=excluded.kind,value=excluded.value,revision=editor_drafts.revision+1,updated_at=clock_timestamp()
 returning * into saved;
 return to_jsonb(saved)-'owner_id';
end $$;
revoke all on function public.editor_save_draft(text,text,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.editor_save_draft(text,text,jsonb,bigint) to authenticated;
create or replace function public.editor_delete_draft(p_key text,p_revision bigint) returns boolean
language plpgsql security definer set search_path='' as $$
declare saved public.editor_drafts;actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.editors where user_id=actor and role in ('admin','management')) then raise exception 'Editor required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_key,0));
 select * into saved from public.editor_drafts where owner_id=actor and draft_key=p_key for update;
 if not found then return true;end if;
 if saved.revision is distinct from p_revision then raise exception 'Draft changed' using errcode='40001';end if;
 delete from public.editor_drafts where owner_id=actor and draft_key=p_key;
 return true;
end $$;
revoke all on function public.editor_delete_draft(text,bigint) from public,anon,authenticated;
grant execute on function public.editor_delete_draft(text,bigint) to authenticated;
commit;
