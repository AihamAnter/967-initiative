-- Phase 3: suspended Auth users may not bypass the participation guard via
-- direct PostgREST calls. Unconfirmed users already rejected; profile removal
-- remains possible through its separate, narrowly scoped action.
CREATE OR REPLACE FUNCTION public.debate_require_user_base(p_action text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); n integer; lim integer;
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null and (banned_until is null or banned_until<=clock_timestamp())) then raise exception 'Confirm your email before participating' using errcode='42501'; end if;
 if not exists(select 1 from public.public_profiles where user_id=u and terms_accepted_at is not null and not suspended and deletion_requested_at is null) then raise exception 'Complete your profile or contact moderation' using errcode='42501'; end if;
 lim:=case p_action when 'vote' then 20 when 'suggestion' then 3 when 'report' then 6 else 5 end;
 insert into public.debate_rate_limits as r values(u,p_action,clock_timestamp(),1)
 on conflict(user_id,action) do update set hits=case when r.window_start<clock_timestamp()-interval '1 minute' then 1 else r.hits+1 end,
 window_start=case when r.window_start<clock_timestamp()-interval '1 minute' then clock_timestamp() else r.window_start end returning hits into n;
 if n>lim then raise exception 'Please wait before trying again' using errcode='P0429'; end if;
 return u;
end $function$

