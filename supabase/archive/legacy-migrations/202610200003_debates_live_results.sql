-- Apply after 202610200001 and 202610200002. No Auth settings are changed.
begin;

alter table public.debates add column if not exists live_results_enabled boolean not null default true;
-- Preserve results that management had explicitly hidden before this upgrade.
update public.debates set live_results_enabled=false where results<>'{}'::jsonb and not results_published;

create table if not exists public.debate_result_updates (
 debate_id uuid primary key references public.debates(id) on delete cascade,
 version bigint not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.debate_result_updates enable row level security;
revoke all on public.debate_result_updates from public,anon,authenticated;
grant select on public.debate_result_updates to anon,authenticated;
create index if not exists debate_vote_distribution_idx on public.debate_votes(poll_id,option_id);

create or replace function public.debate_live_results_visible(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.debates where id=p_id and publication_status in ('published','archived') and live_results_enabled)
$$;
create or replace function public.debate_result_updates_visible(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.debates where id=p_id and publication_status in ('published','archived'))
$$;
drop policy if exists result_updates_public on public.debate_result_updates;
create policy result_updates_public on public.debate_result_updates for select to anon,authenticated
 using(public.debate_result_updates_visible(debate_id));

create or replace function public.debate_touch_results(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into public.debate_result_updates as r(debate_id,version,updated_at)
 select id,1,clock_timestamp() from public.debates where id=p_id
 on conflict(debate_id) do update set version=r.version+1,updated_at=excluded.updated_at;
end $$;
create or replace function public.debate_result_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op<>'INSERT' and public.debate_live_results_visible(old.debate_id) then perform public.debate_touch_results(old.debate_id); end if;
 if tg_op='INSERT' then
 if public.debate_live_results_visible(new.debate_id) then perform public.debate_touch_results(new.debate_id); end if;
 elsif tg_op='UPDATE' and new.debate_id<>old.debate_id and public.debate_live_results_visible(new.debate_id) then perform public.debate_touch_results(new.debate_id); end if;
 return null;
end $$;
do $$ declare t text; begin
 foreach t in array array['debate_votes','debate_polls','debate_poll_options'] loop
 execute format('drop trigger if exists debate_result_change on public.%I',t);
 execute format('create trigger debate_result_change after insert or update or delete on public.%I for each row execute function public.debate_result_change()',t);
 end loop;
end $$;
drop trigger if exists debate_result_visibility_sync on public.debates;
drop function if exists public.debate_result_visibility_sync();
create or replace function public.debate_result_debate_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin perform public.debate_touch_results(new.id);return null;end $$;
drop trigger if exists debate_result_debate_change on public.debates;
create trigger debate_result_debate_change after insert or update of publication_status,live_results_enabled,results_published on public.debates
 for each row execute function public.debate_result_debate_change();
insert into public.debate_result_updates(debate_id) select id from public.debates on conflict do nothing;

-- Only aggregates leave the database. Individual votes retain their owner-only RLS.
create or replace function public.debate_live_results(p_debate uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p public.debate_polls; result jsonb:='{}'; total_n bigint; distribution jsonb; paired_n bigint; changed_n bigint;
begin
 if not public.debate_live_results_visible(p_debate) then return null; end if;
 for p in select * from public.debate_polls where debate_id=p_debate and enabled order by phase loop
 select count(*) into total_n from public.debate_votes where poll_id=p.id;
 select coalesce(jsonb_agg(jsonb_build_object('option_id',o.id,'label',o.label,'count',coalesce(v.n,0),
 'percent',case when total_n=0 then 0 else round(coalesce(v.n,0)*100.0/total_n,1) end) order by o.position,o.id),'[]'::jsonb)
 into distribution from public.debate_poll_options o left join
 (select option_id,count(*) n from public.debate_votes where poll_id=p.id group by option_id) v on v.option_id=o.id where o.debate_id=p_debate;
 result:=result||jsonb_build_object(p.phase,jsonb_build_object('participants',total_n,'options',distribution,'approximate',false));
 end loop;
 if result ? 'before' and result ? 'after' then
 select count(*),count(*) filter(where a.option_id<>b.option_id) into paired_n,changed_n
 from public.debate_votes a join public.debate_polls pa on pa.id=a.poll_id and pa.phase='before'
 join public.debate_votes b on b.user_id=a.user_id and b.debate_id=a.debate_id
 join public.debate_polls pb on pb.id=b.poll_id and pb.phase='after' where a.debate_id=p_debate;
 if paired_n>0 then result:=result||jsonb_build_object('paired',jsonb_build_object('participants',paired_n,'changed_percent',round(changed_n*100.0/paired_n,1)));end if;
 end if;
 return jsonb_build_object('results',result,'updated_at',statement_timestamp());
end $$;

revoke all on function public.debate_touch_results(uuid),public.debate_result_change(),public.debate_result_debate_change() from public,anon,authenticated;
revoke all on function public.debate_result_updates_visible(uuid),public.debate_live_results_visible(uuid),public.debate_live_results(uuid) from public,anon,authenticated;
grant execute on function public.debate_result_updates_visible(uuid),public.debate_live_results_visible(uuid),public.debate_live_results(uuid) to anon,authenticated;
-- Publish a harmless invalidation row, NEVER debate_votes or user identifiers.
do $$ begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
 create publication supabase_realtime;
 end if;
 if not exists
 (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='debate_result_updates') then
 alter publication supabase_realtime add table public.debate_result_updates;
 end if;
end $$;
-- Visibility is available before any final snapshot exists, with the same role,
-- reason, revision and audit checks as the existing administrative action.
create or replace function public.debate_admin_mutate(p_action text,p_id uuid default null,p_revision bigint default null,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare r text:=public.debate_role(); d public.debates; old_d public.debates; speaker_record public.debate_speakers; x jsonb; k text; saved uuid; reason text:=coalesce(p_data->>'reason','تحديث تحريري'); has_votes boolean; result jsonb; task_title text; t jsonb; link_id uuid;
begin
 if r is null then raise exception 'Editor required' using errcode='42501'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>180000 then raise exception 'Invalid request data' using errcode='22023'; end if;
 if p_action in ('suspend','delete','anonymize','results_visibility') and r<>'management' then raise exception 'Management required' using errcode='42501'; end if;
 if p_action='speaker' then
 if exists(select 1 from jsonb_array_elements(coalesce(p_data->'social_links','[]')) z where jsonb_typeof(z)<>'object' or length(coalesce(z->>'label',''))>100 or coalesce(z->>'url','') !~ '^https://[^/@[:space:]]+(/|$)') then raise exception 'Invalid social link' using errcode='22023'; end if;
 select * into speaker_record from public.debate_speakers where id=p_id for update;
 speaker_record:=jsonb_populate_record(speaker_record,p_data-array['reason']);
 if p_id is null then insert into public.debate_speakers(slug,name,specialty,bio,photo_url,social_links,is_published) values(speaker_record.slug,speaker_record.name,coalesce(speaker_record.specialty,''),coalesce(speaker_record.bio,''),speaker_record.photo_url,coalesce(speaker_record.social_links,'[]'),coalesce(speaker_record.is_published,false)) returning id into saved;
 else update public.debate_speakers set slug=speaker_record.slug,name=speaker_record.name,specialty=speaker_record.specialty,bio=speaker_record.bio,photo_url=speaker_record.photo_url,social_links=speaker_record.social_links,is_published=speaker_record.is_published,updated_at=clock_timestamp() where id=p_id returning id into saved; end if;
 if not speaker_record.is_published then
 update public.debates set publication_status='hidden',revision=revision+1,updated_at=clock_timestamp() where publication_status in ('published','archived') and id in (select debate_id from public.debate_participants where speaker_id=saved);
 update public.works set is_published=false where debate_id in (select debate_id from public.debate_participants where speaker_id=saved);
 end if;
 elsif p_action in ('suspend','anonymize') then
 if length(btrim(coalesce(p_data->>'reason','')))<3 then raise exception 'Reason required' using errcode='22023'; end if;
 if p_action='suspend' then update public.public_profiles set suspended=(p_data->>'suspended')::boolean,suspension_reason=reason,updated_at=clock_timestamp() where user_id=p_id returning user_id into saved;
 else
 if not exists(select 1 from public.public_profiles where user_id=p_id and deletion_requested_at is not null) then raise exception 'Deletion request required' using errcode='22023'; end if;
 update public.public_profiles set display_name='حساب محذوف',avatar_url=null,show_avatar=false,suspended=true,updated_at=clock_timestamp() where user_id=p_id returning user_id into saved;
 update public.debate_comments set user_id=null where user_id=p_id;
 update public.debate_questions set user_id=null where user_id=p_id;
 delete from public.debate_votes where user_id=p_id;
 update public.debate_suggestions set user_id=null where user_id=p_id;
 end if;
 elsif p_action='moderate' then
 if length(btrim(coalesce(p_data->>'reason','')))<3 then raise exception 'Reason required' using errcode='22023'; end if;
 case p_data->>'kind'
 when 'comments' then
 if not exists(select 1 from public.debate_comments where id=p_id and updated_at=(p_data->>'updated_at')::timestamptz for update) then raise exception 'Comment changed; review it again' using errcode='40001'; end if;
 update public.debate_comments set status=p_data->>'status',updated_at=clock_timestamp() where id=p_id and status<>'deleted' and p_data->>'status' in ('approved','rejected','hidden') returning id into saved;
 when 'questions' then update public.debate_questions set status=p_data->>'status' where id=p_id returning id into saved;
 when 'suggestions' then update public.debate_suggestions set status=p_data->>'status' where id=p_id returning id into saved;
 when 'reports' then update public.debate_reports set status=p_data->>'status' where id=p_id returning id into saved;
 else raise exception 'Invalid moderation kind' using errcode='22023'; end case;
 elsif p_action='convert' then
 select to_jsonb(z) into x from public.debate_suggestions z where id=p_id for update;
 if x is null or x->>'converted_debate_id' is not null then raise exception 'Suggestion unavailable or already converted' using errcode='23505'; end if;
 insert into public.debates(slug,title,question,description,debate_type,created_by) values('debate-'||substr(gen_random_uuid()::text,1,12),x->>'title',x->>'question',x->>'explanation','prerecorded',auth.uid()) returning id into saved;
 update public.debate_suggestions set status='accepted',converted_debate_id=saved where id=p_id;
 else
 if p_action='save' and p_id is null then
 insert into public.debates(slug,title,question,debate_type,created_by) values(p_data->>'slug',p_data->>'title',p_data->>'question',p_data->>'debate_type',auth.uid()) returning * into d;
 else
 select * into d from public.debates where id=p_id for update;
 if not found then raise exception 'Debate not found' using errcode='P0002'; end if;
 if p_revision is distinct from d.revision then raise exception 'Revision conflict' using errcode='40001'; end if;
 end if;
 old_d:=d; saved:=d.id;
 select exists(select 1 from public.debate_votes where debate_id=d.id) into has_votes;
 case p_action
 when 'save' then
 if jsonb_array_length(coalesce(p_data->'participants','[]'))>20 or jsonb_array_length(coalesce(p_data->'options','[]'))>12 or jsonb_array_length(coalesce(p_data->'polls','[]'))>2 or jsonb_array_length(coalesce(p_data->'chapters','[]'))>100 or jsonb_array_length(coalesce(p_data->'axes','[]'))>20 then raise exception 'Too many items' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements_text(coalesce(p_data->'axes','[]')) a where length(btrim(a)) not between 1 and 500) then raise exception 'Invalid debate axis' using errcode='22023'; end if;
 for k in select jsonb_object_keys(p_data) loop
 if k<>all(array['slug','title','question','description','category','debate_type','publication_status','stage','scheduled_at','cover_url','live_platform','live_url','recording_url','recording_published','duration_seconds','axes','summary','summary_published','questions_open','comments_open','seo_title','seo_description','participants','options','polls','chapters','reason']) then raise exception 'Invalid debate field' using errcode='22023'; end if; end loop;
 d:=jsonb_populate_record(d,p_data-array['participants','options','polls','chapters','reason']);
 if d.slug in ('suggest','speakers') then raise exception 'Reserved debate slug' using errcode='22023'; end if;
 -- Only management can repair a previously published reserved URL, with a reason.
 if (old_d.first_published_at is not null or has_votes) and
 (d.debate_type<>old_d.debate_type or (d.slug<>old_d.slug and not (old_d.slug in ('suggest','speakers') and r='management' and length(btrim(coalesce(p_data->>'reason','')))>=3)))
 then raise exception 'Published type and URL are locked' using errcode='22023'; end if;
 if (has_votes or old_d.results<>'{}'::jsonb) and d.question<>old_d.question then raise exception 'Question is locked after voting' using errcode='22023'; end if;
 if old_d.stage='live' and d.stage not in ('live','ended','postponed','cancelled') then raise exception 'End the live broadcast first' using errcode='22023'; end if;
 if d.stage='live' and old_d.stage not in ('live','announced','upcoming','postponed') then raise exception 'Invalid live transition' using errcode='22023'; end if;
 if old_d.recording_published and not d.recording_published and r<>'management' then raise exception 'Management required to withdraw recording' using errcode='42501'; end if;
 if (has_votes or old_d.results<>'{}'::jsonb) and (p_data ? 'options') then
 if (select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'label',o.label) order by o.position,o.id),'[]') from public.debate_poll_options o where debate_id=d.id) is distinct from (select coalesce(jsonb_agg(jsonb_build_object('id',x->>'id','label',x->>'label') order by ord),'[]') from jsonb_array_elements(p_data->'options') with ordinality as a(x,ord)) then raise exception 'Options are locked after voting' using errcode='22023'; end if;
 elsif p_data ? 'options' then
 delete from public.debate_poll_options where debate_id=d.id;
 for x in select value from jsonb_array_elements(p_data->'options') loop insert into public.debate_poll_options(id,debate_id,label,position) values(coalesce((x->>'id')::uuid,gen_random_uuid()),d.id,x->>'label',coalesce((x->>'position')::integer,0)); end loop;
 end if;
 if p_data ? 'participants' then
 if exists(select 1 from public.debate_participants p join public.debate_questions q on q.participant_id=p.id and q.debate_id=p.debate_id
 where p.debate_id=d.id and not exists(select 1 from jsonb_array_elements(p_data->'participants') z where (z->>'speaker_id')::uuid=p.speaker_id))
 then raise exception 'Participant has audience questions' using errcode='22023'; end if;
 -- Preserve participant IDs used by questions; remove only unreferenced entries.
 delete from public.debate_participants p where debate_id=d.id and not exists(select 1 from jsonb_array_elements(p_data->'participants') z where (z->>'speaker_id')::uuid=p.speaker_id);
 for x in select value from jsonb_array_elements(p_data->'participants') loop
 insert into public.debate_participants(debate_id,speaker_id,stance,role_label,position) values(d.id,(x->>'speaker_id')::uuid,coalesce(x->>'stance',''),coalesce(x->>'role_label','مناظر'),coalesce((x->>'position')::integer,0)) on conflict(debate_id,speaker_id) do update set stance=excluded.stance,role_label=excluded.role_label,position=excluded.position; end loop;
 end if;
 if p_data ? 'polls' then
 for x in select value from jsonb_array_elements(p_data->'polls') loop
 if (has_votes or old_d.results<>'{}'::jsonb) and exists(select 1 from public.debate_polls where debate_id=d.id and phase=x->>'phase' and ((is_closed and coalesce((x->>'is_closed')::boolean,false)=false) or allow_change is distinct from coalesce((x->>'allow_change')::boolean,false) or opens_at is distinct from (x->>'opens_at')::timestamptz or closes_at is distinct from (x->>'closes_at')::timestamptz)) then
 if r<>'management' or length(btrim(coalesce(p_data->>'reason','')))<3 or old_d.results ? (x->>'phase') then raise exception 'Sensitive poll change requires management reason; published results are frozen' using errcode='42501'; end if; end if;
 insert into public.debate_polls(debate_id,phase,enabled,opens_at,closes_at,is_closed,allow_change) values(d.id,x->>'phase',coalesce((x->>'enabled')::boolean,false),(x->>'opens_at')::timestamptz,(x->>'closes_at')::timestamptz,coalesce((x->>'is_closed')::boolean,false),coalesce((x->>'allow_change')::boolean,false)) on conflict(debate_id,phase) do update set enabled=excluded.enabled,opens_at=excluded.opens_at,closes_at=excluded.closes_at,is_closed=excluded.is_closed,allow_change=excluded.allow_change;
 end loop;
 end if;
 if p_data ? 'chapters' then
 delete from public.debate_video_chapters where debate_id=d.id;
 for x in select value from jsonb_array_elements(p_data->'chapters') loop
 if d.duration_seconds is not null and (x->>'start_seconds')::int>=d.duration_seconds then raise exception 'Chapter exceeds duration' using errcode='22023'; end if;
 insert into public.debate_video_chapters(debate_id,title,start_seconds) values(d.id,x->>'title',(x->>'start_seconds')::integer); end loop; end if;
 if d.publication_status in ('published','archived') then
 if (select count(*) from public.debate_participants p join public.debate_speakers s on s.id=p.speaker_id and s.is_published where p.debate_id=d.id)<2 then raise exception 'Publish at least two approved speakers' using errcode='22023'; end if;
 if exists(select 1 from public.debate_polls where debate_id=d.id and enabled) and (select count(*) from public.debate_poll_options where debate_id=d.id)<2 then raise exception 'Poll requires at least two options' using errcode='22023'; end if;
 d.first_published_at:=coalesce(old_d.first_published_at,clock_timestamp()); end if;
 update public.debates set slug=d.slug,title=d.title,question=d.question,description=d.description,category=d.category,debate_type=d.debate_type,publication_status=d.publication_status,stage=d.stage,scheduled_at=d.scheduled_at,cover_url=d.cover_url,live_platform=d.live_platform,live_url=d.live_url,recording_url=d.recording_url,recording_published=d.recording_published,duration_seconds=d.duration_seconds,axes=d.axes,summary=d.summary,summary_published=d.summary_published,questions_open=d.questions_open,comments_open=d.comments_open,seo_title=d.seo_title,seo_description=d.seo_description,first_published_at=d.first_published_at,revision=revision+1,updated_at=clock_timestamp() where id=d.id;
 when 'results_publish' then
 if d.results ? coalesce(p_data->>'phase','after') then raise exception 'Result snapshot already published' using errcode='23505'; end if;
 result:=public.debate_result_snapshot(d.id,coalesce(p_data->>'phase','after'));
 if not (result ? coalesce(p_data->>'phase','after')) then raise exception 'No enabled poll for this phase' using errcode='22023'; end if;
 update public.debates set results=results||result,results_published=live_results_enabled,revision=revision+1,updated_at=clock_timestamp() where id=d.id;
 when 'results_visibility' then
 if length(btrim(coalesce(p_data->>'reason','')))<3 or not (p_data ? 'visible') then raise exception 'Visibility and reason required' using errcode='22023'; end if;
 update public.debates set results_published=(p_data->>'visible')::boolean,live_results_enabled=(p_data->>'visible')::boolean,revision=revision+1,updated_at=clock_timestamp() where id=d.id;
 when 'tasks' then
 if exists(select 1 from public.debate_task_links where debate_id=d.id) then raise exception 'Preparation tasks already created' using errcode='23505'; end if;
 for task_title in select unnest(array['تحديد الموضوع','التواصل مع المناظرين','إعداد الأسئلة والمحاور','تأكيد الموعد','تجهيز الغلاف',case when d.debate_type='external_live' then 'تجهيز رابط البث' else 'تجهيز رابط التسجيل' end,'مراجعة أسئلة الجمهور','نشر إعلان المناظرة',case when d.debate_type='external_live' then 'إضافة التسجيل بعد انتهاء البث' else 'مراجعة نشر التسجيل' end,'إعداد الملخص','نشر نتائج التصويت']) loop
 t:=public.task_mutate('create',null,null,jsonb_build_object('title',task_title||' — '||left(d.title,150),'description','مناظرة: '||d.title,'assigned_to',auth.uid(),'tags',jsonb_build_array('مناظرات 967'),'links',jsonb_build_array('https://967-initiative.vercel.app/admin/debates?debate='||d.id), 'project_id',(select id from public.task_projects where name='مناظرات 967' limit 1)));
 insert into public.debate_task_links values(d.id,(t->>'id')::uuid); end loop;
 when 'media' then
 if not d.recording_published or d.publication_status not in ('published','archived') then raise exception 'Publish the recording first' using errcode='22023'; end if;
 insert into public.works(slug,title,summary,category,platform,external_url,thumbnail_url,is_published,debate_id) values('debate-'||d.slug,d.title,left(d.description,1000),'مناظرات 967','فيديو',d.recording_url,d.cover_url,true,d.id) on conflict(debate_id) do update set title=excluded.title,summary=excluded.summary,external_url=excluded.external_url,thumbnail_url=excluded.thumbnail_url,is_published=true;
 when 'delete' then
 if length(btrim(coalesce(p_data->>'reason','')))<3 then raise exception 'Reason required' using errcode='22023'; end if;
 delete from public.debates where id=d.id;
 else raise exception 'Invalid action' using errcode='22023'; end case;
 -- Synchronize the optional media listing, including withdrawal and visibility.
 if p_action='save' then update public.works set title=d.title,summary=left(d.description,1000),external_url=coalesce(d.recording_url,external_url),thumbnail_url=d.cover_url,is_published=d.recording_published and d.publication_status in ('published','archived') where debate_id=d.id; end if;
 end if;
 if saved is null then raise exception 'Record not found' using errcode='P0002'; end if;
 insert into public.debate_moderation_actions(actor_id,action,target_id,reason) values(auth.uid(),p_action,saved,reason);
 return jsonb_build_object('id',saved);
end $$;
comment on table public.debate_votes is 'Individual ballots: owner SELECT only. Public results use checked aggregate RPCs.';
comment on table public.debate_result_updates is 'Public debate invalidation only: no ballots, user IDs or choices.';
commit;
