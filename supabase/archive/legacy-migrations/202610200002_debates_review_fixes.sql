-- Review fixes for debates. Apply AFTER 202610200001_debates.sql.
-- Does not change existing content, memberships, publication state or Auth settings.
-- Existing reserved slugs are repaired explicitly by Management in the editor.
begin;
alter table public.debates drop constraint if exists debate_slug_routes_check;
-- Preserve updates/withdrawals of legacy rows while preventing new reserved URLs.
create or replace function public.debate_slug_route_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.slug in ('suggest','speakers') and (tg_op='INSERT' or new.slug is distinct from old.slug) then raise exception 'Reserved debate slug' using errcode='22023'; end if;
 return new;
end $$;
drop trigger if exists debate_slug_route_guard on public.debates;
create trigger debate_slug_route_guard before insert or update of slug on public.debates for each row execute function public.debate_slug_route_guard();
create or replace function public.debate_delete_rate() returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); n integer;
begin
 if u is null then raise exception 'Sign in required' using errcode='42501'; end if;
 insert into public.debate_rate_limits as r values(u,'comment_delete',clock_timestamp(),1)
 on conflict(user_id,action) do update set hits=case when r.window_start<clock_timestamp()-interval '1 minute' then 1 else r.hits+1 end,
 window_start=case when r.window_start<clock_timestamp()-interval '1 minute' then clock_timestamp() else r.window_start end returning hits into n;
 if n>5 then raise exception 'Please wait before trying again' using errcode='P0429'; end if;
end $$;
create or replace function public.debate_audience_mutate(p_action text,p_id uuid default null,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); d public.debates; poll public.debate_polls; c public.debate_comments; saved uuid; existing_vote public.debate_votes;
begin
 if u is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>180000 then raise exception 'Invalid request data' using errcode='22023'; end if;
 if p_action='profile' then
 if coalesce(p_data->>'accepted','false')<>'true' and not exists(select 1 from public.public_profiles where user_id=u and terms_accepted_at is not null) then raise exception 'Accept privacy policy and terms' using errcode='22023'; end if;
 insert into public.public_profiles(user_id,display_name,avatar_url,show_avatar) values(u,p_data->>'display_name',nullif(p_data->>'avatar_url',''),coalesce((p_data->>'show_avatar')::boolean,false))
 on conflict(user_id) do update set display_name=excluded.display_name,avatar_url=excluded.avatar_url,show_avatar=excluded.show_avatar,terms_accepted_at=coalesce(public.public_profiles.terms_accepted_at,excluded.terms_accepted_at),updated_at=clock_timestamp();
 return jsonb_build_object('id',u);
 elsif p_action='comment_delete' then
 -- Removing one's own content is independent of eligibility to participate.
 perform public.debate_delete_rate();
 select * into c from public.debate_comments where id=p_id for update;
 if not found or c.user_id is distinct from u or c.status='deleted' then raise exception 'Comment unavailable' using errcode='42501'; end if;
 update public.debate_comments set status='deleted',body='حُذف التعليق',updated_at=clock_timestamp() where id=p_id;
 return jsonb_build_object('id',p_id);
 elsif p_action='deletion_request' then
 -- Existing Auth accounts may have no audience profile yet. Deletion must not
 -- require consent to participate or fabricate an acceptance timestamp.
 insert into public.public_profiles(user_id,display_name,terms_accepted_at,deletion_requested_at) values(u,'حساب يطلب الحذف',null,clock_timestamp())
 on conflict(user_id) do update set deletion_requested_at=clock_timestamp(),updated_at=clock_timestamp();
 return jsonb_build_object('requested',true);
 end if;
 perform public.debate_require_user(case when p_action in ('comment','comment_edit','comment_delete') then 'comment' else p_action end);
 if p_action='suggestion' then
 insert into public.debate_suggestions(user_id,title,question,explanation,importance,stances,suggested_speakers) values(u,p_data->>'title',p_data->>'question',p_data->>'explanation',p_data->>'importance',p_data->>'stances',coalesce(p_data->>'suggested_speakers','')) returning id into saved;
 return jsonb_build_object('id',saved);
 elsif p_action='report' then
 if not exists(select 1 from public.debate_comments where id=p_id and status='approved' and public.debate_visible(debate_id)) then raise exception 'Comment unavailable' using errcode='P0002'; end if;
 insert into public.debate_reports(comment_id,user_id,reason) values(p_id,u,p_data->>'reason') returning id into saved;
 return jsonb_build_object('id',saved);
 elsif p_action in ('comment_edit','comment_delete') then
 select * into c from public.debate_comments where id=p_id for update;
 if not found or c.user_id is distinct from u or c.status='deleted' then raise exception 'Comment unavailable' using errcode='42501'; end if;
 if p_action='comment_delete' then update public.debate_comments set status='deleted',body='حُذف التعليق',updated_at=clock_timestamp() where id=p_id;
 else update public.debate_comments set body=p_data->>'body',status=case when body is distinct from p_data->>'body' then 'pending' else status end,updated_at=clock_timestamp() where id=p_id; end if;
 return jsonb_build_object('id',p_id);
 end if;
 select * into d from public.debates where id=(p_data->>'debate_id')::uuid for share;
 if not found or d.publication_status not in ('published','archived') or d.stage='cancelled' then raise exception 'Debate unavailable' using errcode='42501'; end if;
 case p_action
 when 'vote' then
 select * into poll from public.debate_polls where id=p_id and debate_id=d.id for update;
 if not found or not poll.enabled or poll.is_closed or (poll.opens_at is not null and poll.opens_at>clock_timestamp()) or (poll.closes_at is not null and poll.closes_at<=clock_timestamp()) or d.publication_status='archived' then raise exception 'Poll is closed' using errcode='22023'; end if;
 if poll.phase='after' and ((d.debate_type='external_live' and d.stage not in ('ended','recording_available')) or (d.debate_type='prerecorded' and (not d.recording_published or coalesce((p_data->>'watched_confirmed')::boolean,false)=false))) then raise exception 'Confirm you watched the published recording' using errcode='22023'; end if;
 if not exists(select 1 from public.debate_poll_options where id=(p_data->>'option_id')::uuid and debate_id=d.id) then raise exception 'Invalid option' using errcode='22023'; end if;
 select * into existing_vote from public.debate_votes where user_id=u and poll_id=p_id;
 if found and not poll.allow_change then raise exception 'Already voted' using errcode='23505'; end if;
 insert into public.debate_votes(user_id,debate_id,poll_id,option_id,watched_confirmed) values(u,d.id,p_id,(p_data->>'option_id')::uuid,coalesce((p_data->>'watched_confirmed')::boolean,false))
 on conflict(user_id,poll_id) do update set option_id=excluded.option_id,watched_confirmed=excluded.watched_confirmed,updated_at=clock_timestamp() returning id into saved;
 when 'question' then
 if not d.questions_open or d.publication_status='archived' then raise exception 'Questions closed' using errcode='22023'; end if;
 if coalesce(p_data->>'axis','')<>'' and not (p_data->>'axis'=any(d.axes)) then raise exception 'Invalid axis' using errcode='22023'; end if;
 insert into public.debate_questions(debate_id,user_id,body,participant_id,axis,anonymous) values(d.id,u,p_data->>'body',(p_data->>'participant_id')::uuid,coalesce(p_data->>'axis',''),coalesce((p_data->>'anonymous')::boolean,false)) returning id into saved;
 when 'comment' then
 if not d.comments_open or d.publication_status='archived' then raise exception 'Comments closed' using errcode='22023'; end if;
 if p_data->>'parent_id' is not null and not exists(select 1 from public.debate_comments where id=(p_data->>'parent_id')::uuid and debate_id=d.id and status='approved' and parent_id is null) then raise exception 'Reply to a published top-level comment' using errcode='22023'; end if;
 insert into public.debate_comments(debate_id,user_id,parent_id,body) values(d.id,u,(p_data->>'parent_id')::uuid,p_data->>'body') returning id into saved;
 else raise exception 'Invalid action' using errcode='22023';
 end case;
 return jsonb_build_object('id',saved);
end $$;
create or replace function public.debate_result_snapshot(p_id uuid,p_phase text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.debate_polls; total_n integer; small boolean; distribution jsonb; result jsonb:='{}'; paired integer; changed integer;
begin
 if not exists(select 1 from public.debate_polls where debate_id=p_id and phase=p_phase and enabled) then raise exception 'No enabled poll for this phase' using errcode='22023'; end if;
 if p_phase not in ('before','after') then raise exception 'Invalid result phase' using errcode='22023'; end if;
 for p in select * from public.debate_polls where debate_id=p_id and enabled and phase=p_phase order by phase loop
 if not p.is_closed and (p.closes_at is null or p.closes_at>now()) then raise exception 'Close enabled polls before publishing results' using errcode='22023'; end if;
 select count(*) into total_n from public.debate_votes where poll_id=p.id;
 select exists(select 1 from public.debate_votes where poll_id=p.id group by option_id having count(*) between 1 and 4) into small;
 if total_n<10 or small then result:=result||jsonb_build_object(p.phase,jsonb_build_object('suppressed',true));
 else
 select jsonb_agg(jsonb_build_object('option_id',o.id,'label',o.label,'percent',round((select count(*) from public.debate_votes v where v.poll_id=p.id and v.option_id=o.id)*100.0/total_n/5)*5) order by o.position,o.id) into distribution from public.debate_poll_options o where o.debate_id=p_id;
 result:=result||jsonb_build_object(p.phase,jsonb_build_object('participants',total_n/5*5,'options',distribution,'approximate',true)); end if;
 end loop;
 select count(*),count(*) filter(where a.option_id<>b.option_id) into paired,changed from public.debate_votes a join public.debate_polls pa on pa.id=a.poll_id and pa.phase='before' join public.debate_votes b on b.user_id=a.user_id and b.debate_id=a.debate_id join public.debate_polls pb on pb.id=b.poll_id and pb.phase='after' where a.debate_id=p_id;
 if p_phase='after' and (select count(*) from public.debate_polls where debate_id=p_id and enabled)=2 and not exists(select 1 from public.debate_polls where debate_id=p_id and enabled and not is_closed and (closes_at is null or closes_at>now())) and paired>=10 and (changed=0 or changed>=5) and (paired-changed=0 or paired-changed>=5) then result:=result||jsonb_build_object('paired',jsonb_build_object('participants',paired/5*5,'changed_percent',round(changed*100.0/paired/5)*5)); end if;
 return result;
end $$;
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
 update public.debates set results=results||result,results_published=true,revision=revision+1,updated_at=clock_timestamp() where id=d.id;
 when 'results_visibility' then
 if length(btrim(coalesce(p_data->>'reason','')))<3 or not (p_data ? 'visible') or d.results='{}'::jsonb then raise exception 'Existing results, visibility and reason required' using errcode='22023'; end if;
 update public.debates set results_published=(p_data->>'visible')::boolean,revision=revision+1,updated_at=clock_timestamp() where id=d.id;
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
revoke all on function public.debate_slug_route_guard(),public.debate_delete_rate(),public.debate_result_snapshot(uuid,text) from public,anon,authenticated;
revoke all on function public.debate_audience_mutate(text,uuid,jsonb),public.debate_admin_mutate(text,uuid,bigint,jsonb) from public,anon;
grant execute on function public.debate_audience_mutate(text,uuid,jsonb),public.debate_admin_mutate(text,uuid,bigint,jsonb) to authenticated;
commit;
