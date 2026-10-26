-- Apply after debates 001–003 and 202610210001_inline_editor.sql.
-- New comments/questions publish immediately. Existing waiting submissions are
-- released; explicitly hidden, rejected and deleted content remains private.
begin;

alter table public.debate_comments alter column status set default 'approved';
alter table public.debate_questions alter column status set default 'approved';

-- Keep the existing Auth, ownership, rate, closed-debate and restriction checks.
-- Editing a published comment stays public; editing a hidden/rejected comment
-- must never let its author reverse a moderator's visibility decision.
do $instant_discussion$
declare definition text;
 old_edit text:=$fragment$,status=case when body is distinct from p_data->>'body' then 'pending' else status end$fragment$;
 new_edit text:=$fragment$,status=status$fragment$;
begin
 definition:=pg_get_functiondef('public.debate_audience_mutate(text,uuid,jsonb)'::regprocedure);
 if position(old_edit in definition)>0 then execute replace(definition,old_edit,new_edit);
 elsif position(new_edit in definition)=0 then raise exception 'Review comment editing before enabling instant discussion'; end if;
end $instant_discussion$;

update public.debate_comments set status='approved',updated_at=clock_timestamp() where status='pending';
update public.debate_questions set status='approved',updated_at=clock_timestamp() where status='new';

-- No table-write privilege is added. Clients still submit through the same RPC.
revoke all on function public.debate_audience_mutate(text,uuid,jsonb) from public,anon;
grant execute on function public.debate_audience_mutate(text,uuid,jsonb) to authenticated;

commit;
