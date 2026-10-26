-- Apply after 202610220001_debates_instant_discussion.sql. No votes or posts
-- are removed, and the current moderation/publication policy is preserved.
begin;

alter table public.debates add column recording_first_published_at timestamptz;
-- Only actual public recording availability counts, never a stored URL or an
-- ended external broadcast. Recover known withdrawals from the existing audit.
update public.debates d set recording_first_published_at=coalesce(
 (select min(h.created_at) from public.debate_moderation_actions h where h.target_id=d.id and
  (h.action='media' or -- This existing action required a public recording.
   (h.before_value->>'recording_published'='true' and h.before_value->>'publication_status' in ('published','archived')) or
   (h.after_value->>'recording_published'='true' and h.after_value->>'publication_status' in ('published','archived')))),
 case when d.recording_published and d.publication_status in ('published','archived') then d.updated_at end);

create function public.debate_recording_lifecycle_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and old.recording_first_published_at is not null then new.recording_first_published_at:=old.recording_first_published_at;
 elsif new.recording_published and new.publication_status in ('published','archived') then new.recording_first_published_at:=clock_timestamp();
 else new.recording_first_published_at:=null; end if;
 return new;
end $$;
create trigger debate_recording_lifecycle before insert or update on public.debates for each row execute function public.debate_recording_lifecycle_guard();
revoke all on function public.debate_recording_lifecycle_guard() from public,anon,authenticated;

-- The existing mutation still owns Auth, consent, restrictions, rate limits,
-- vote uniqueness, watch acknowledgement and all normal validation.
alter function public.debate_audience_mutate(text,uuid,jsonb) rename to debate_audience_mutate_pre_lifecycle;
revoke all on function public.debate_audience_mutate_pre_lifecycle(text,uuid,jsonb) from public,anon,authenticated;
create function public.debate_audience_mutate(p_action text,p_id uuid default null,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.debates; p public.debate_polls; current_phase text;
begin
 if p_action in ('question','vote') then
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  -- Publication uses FOR UPDATE on this same row. A stale request cannot pass
  -- this check and commit after an incompatible publication transition.
  select * into d from public.debates where id=(p_data->>'debate_id')::uuid for share;
  if not found or d.publication_status not in ('published','archived') then raise exception 'Debate unavailable' using errcode='42501'; end if;
  if p_action='question' and (d.recording_published or d.recording_first_published_at is not null) then raise exception 'Questions closed after recording publication' using errcode='P0QCL'; end if;
  if p_action='vote' then
   current_phase:=case when d.recording_published or d.recording_first_published_at is not null then 'after' else 'before' end;
   select * into p from public.debate_polls where id=p_id and debate_id=d.id for update;
   if not found then raise exception 'Poll unavailable' using errcode='P0002'; end if;
   if p.phase<>current_phase or (current_phase='after' and not d.recording_published) then raise exception 'Poll phase changed or recording unavailable' using errcode='P0VPH'; end if;
  end if;
 end if;
 return public.debate_audience_mutate_pre_lifecycle(p_action,p_id,p_data);
end $$;
revoke all on function public.debate_audience_mutate(text,uuid,jsonb) from public,anon;
grant execute on function public.debate_audience_mutate(text,uuid,jsonb) to authenticated;

create function public.debate_participation_state(p_debate uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.debates;
begin
 select * into d from public.debates where id=p_debate and publication_status in ('published','archived');
 if not found then return null; end if;
 return jsonb_build_object('id',d.id,'publication_status',d.publication_status,'stage',d.stage,
  'recording_published',d.recording_published,'recording_first_published_at',d.recording_first_published_at,
  'questions_open',d.questions_open,'comments_open',d.comments_open,'updated_at',d.updated_at,
  'question',d.question,'axes',d.axes,'participants',public.debate_public_record(d)->'participants',
  'polls',coalesce((select jsonb_agg(to_jsonb(p) order by phase) from public.debate_polls p where p.debate_id=d.id),'[]'::jsonb),
  'options',coalesce((select jsonb_agg(to_jsonb(o) order by position,id) from public.debate_poll_options o where o.debate_id=d.id),'[]'::jsonb));
end $$;
revoke all on function public.debate_participation_state(uuid) from public,anon,authenticated;
grant execute on function public.debate_participation_state(uuid) to anon,authenticated;

-- Reuse the existing aggregate calculations and small-sample/rounding policy.
-- A hidden results response still carries public participation state, never
-- votes, counts or identities. Before publication only the first phase leaves.
alter function public.debate_live_results(uuid) rename to debate_live_results_pre_lifecycle;
revoke all on function public.debate_live_results_pre_lifecycle(uuid) from public,anon,authenticated;
create function public.debate_live_results(p_debate uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare state jsonb; totals jsonb; results jsonb; visible boolean;
begin
 state:=public.debate_participation_state(p_debate);if state is null then return null; end if;
 visible:=public.debate_live_results_visible(p_debate);
 totals:=public.debate_live_results_pre_lifecycle(p_debate);results:=coalesce(totals->'results','{}'::jsonb);
 if state->>'recording_first_published_at' is null and state->>'recording_published'<>'true' then results:=results-array['after','paired']; end if;
 return jsonb_build_object('results',results,'results_visible',visible,'participation',state,'updated_at',statement_timestamp());
end $$;
revoke all on function public.debate_live_results(uuid) from public,anon,authenticated;
grant execute on function public.debate_live_results(uuid) to anon,authenticated;

-- Keep old shared URLs and SSR snapshots from exposing a later phase early.
alter function public.debate_detail(text) rename to debate_detail_pre_lifecycle;
revoke all on function public.debate_detail_pre_lifecycle(text) from public,anon,authenticated;
create function public.debate_detail(p_slug text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 result:=public.debate_detail_pre_lifecycle(p_slug);if result is null then return null; end if;
 if result->>'recording_first_published_at' is null and result->>'recording_published'<>'true' then
  result:=jsonb_set(result,'{results}',coalesce(result->'results','{}'::jsonb)-array['after','paired']);
 end if;
 return result;
end $$;
revoke all on function public.debate_detail(text) from public,anon,authenticated;
grant execute on function public.debate_detail(text) to anon,authenticated;

-- Reuse the harmless existing invalidation row and its Realtime channel.
drop trigger debate_result_debate_change on public.debates;
create trigger debate_result_debate_change after insert or update of publication_status,live_results_enabled,results_published,recording_published,stage,questions_open,comments_open,axes,question on public.debates
for each row execute function public.debate_result_debate_change();
update public.debate_result_updates set version=version+1,updated_at=clock_timestamp();

commit;
