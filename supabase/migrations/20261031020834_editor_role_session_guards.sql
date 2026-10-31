-- Phase 1 security: align direct PostgREST / RLS editor checks with server authorization.
-- The existing editorial_can_read() validates a confirmed email and a non-banned
-- auth user. Do not rely on editors membership alone for elevated access.
-- Signatures, owners, SECURITY DEFINER status and grants are preserved.

create or replace function public.is_editor()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.editorial_can_read()
$$;

create or replace function public.is_967_editor()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.editorial_can_read()
$$;

create or replace function public.is_management()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.editorial_can_read()
    and exists (
      select 1 from public.editors e
      where e.user_id = (select auth.uid())
        and e.role = 'management'
    )
$$;

create or replace function public.is_ranking_editor()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.editorial_can_read()
$$;

create or replace function public.debate_role()
returns text
language sql stable security definer
set search_path = ''
as $$
  select e.role
  from public.editors e
  where e.user_id = (select auth.uid())
    and e.role in ('admin','management')
    and public.editorial_can_read()
$$;

create or replace function public.task_role()
returns text
language sql stable security definer
set search_path = ''
as $$
  select e.role
  from public.editors e
  where e.user_id = (select auth.uid())
    and e.role in ('admin','management')
    and public.editorial_can_read()
$$;

-- Public visibility helpers are referenced by RLS policies. Do not revoke
-- EXECUTE from them blindly; an RLS policy could then fail for visitors.
-- Anon calls to these boolean helpers still return false without auth.uid().
-- The separately exposed, public-read debate RPCs are not modified here.
