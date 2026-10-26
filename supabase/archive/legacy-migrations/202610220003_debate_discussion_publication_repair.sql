-- Repair both the ordered installation and an installation where lifecycle
-- 202610220002 was applied without the instant-discussion policy. Requires
-- debates 001-003, inline_editor 202610210001 and recording lifecycle 220002.
-- Does NOT release old pending/new posts or change moderation decisions.
begin;

do $publication_repair$
declare definition text; canonical text;
 old_edit text:=$fragment$,status=case when body is distinct from p_data->>'body' then 'pending' else status end$fragment$;
 new_edit text:=$fragment$,status=status$fragment$;
 old_comment text:=$fragment$insert into public.debate_comments(debate_id,user_id,parent_id,body) values(d.id,u,(p_data->>'parent_id')::uuid,p_data->>'body') returning id into saved;$fragment$;
 new_comment text:=$fragment$insert into public.debate_comments(debate_id,user_id,parent_id,body,status) values(d.id,u,(p_data->>'parent_id')::uuid,p_data->>'body','approved') returning id into saved;$fragment$;
 old_question text:=$fragment$insert into public.debate_questions(debate_id,user_id,body,participant_id,axis,anonymous) values(d.id,u,p_data->>'body',(p_data->>'participant_id')::uuid,coalesce(p_data->>'axis',''),coalesce((p_data->>'anonymous')::boolean,false)) returning id into saved;$fragment$;
 new_question text:=$fragment$insert into public.debate_questions(debate_id,user_id,body,participant_id,axis,anonymous,status) values(d.id,u,p_data->>'body',(p_data->>'participant_id')::uuid,coalesce(p_data->>'axis',''),coalesce((p_data->>'anonymous')::boolean,false),'approved') returning id into saved;$fragment$;
 old_return text:=$fragment$end case;
 return jsonb_build_object('id',saved);$fragment$;
 new_return text:=$fragment$end case;
 return jsonb_build_object('id',saved)||case
  when p_action='comment' then jsonb_build_object('status',(select status from public.debate_comments where id=saved))
  when p_action='question' then jsonb_build_object('status',(select status from public.debate_questions where id=saved))
  else '{}'::jsonb end;$fragment$;
 old_edit_return text:=$fragment$return jsonb_build_object('id',p_id);$fragment$;
 new_edit_return text:=$fragment$return jsonb_build_object('id',p_id,'status',(select status from public.debate_comments where id=p_id));$fragment$;
begin
 if to_regprocedure('public.debate_audience_mutate_pre_lifecycle(text,uuid,jsonb)') is null then
  raise exception 'Apply the recording lifecycle migration 202610220002 before this repair';
 end if;
 canonical:=pg_get_functiondef('public.debate_audience_mutate(text,uuid,jsonb)'::regprocedure);
 if position('debate_audience_mutate_pre_lifecycle' in canonical)=0 or position('P0QCL' in canonical)=0 or position('P0VPH' in canonical)=0 then
  raise exception 'Review the current recording lifecycle guard before repairing publication';
 end if;
 definition:=replace(pg_get_functiondef('public.debate_audience_mutate_pre_lifecycle(text,uuid,jsonb)'::regprocedure),E'\r\n',E'\n');
 -- Fail closed on an unfamiliar implementation instead of replacing account,
 -- reply, rate, ownership, vote, question-axis or moderation checks.
 if position(old_comment in definition)=0 or position(old_question in definition)=0 or position(old_return in definition)=0 or position(old_edit_return in definition)=0 then
  raise exception 'Review the current audience mutation before repairing publication';
 end if;
 if position(old_edit in definition)>0 then definition:=replace(definition,old_edit,new_edit);
 elsif position(new_edit in definition)=0 then raise exception 'Review comment editing before repairing publication'; end if;
 definition:=replace(definition,old_comment,new_comment);
 definition:=replace(definition,old_question,new_question);
 definition:=replace(definition,old_return,new_return);
 definition:=replace(definition,old_edit_return,new_edit_return);
 execute definition;
end $publication_repair$;

-- New rows also have the correct policy when created by trusted internal code.
-- Clients still have no direct INSERT/UPDATE privilege on these tables.
alter table public.debate_comments alter column status set default 'approved';
alter table public.debate_questions alter column status set default 'approved';
revoke all on function public.debate_audience_mutate_pre_lifecycle(text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.debate_audience_mutate(text,uuid,jsonb) from public,anon;
grant execute on function public.debate_audience_mutate(text,uuid,jsonb) to authenticated;

commit;
