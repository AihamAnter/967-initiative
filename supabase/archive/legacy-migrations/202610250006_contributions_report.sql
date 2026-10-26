-- REVIEW ONLY. Uses actual committed events; no seed or backfill.
begin;
-- Parent publication can change without touching an indicator/value row.
create function public.editorial_publication(p_type text,p_id text,p_known boolean) returns boolean language plpgsql stable security invoker set search_path='' as $$
begin
 if not public.editorial_can_read() then raise exception 'Editor required' using errcode='42501';end if;
 if p_type='statistic_value' then return exists(select 1 from public.stat_values v join public.stat_indicators i on i.id=v.indicator_id join public.stat_domains d on d.id=i.domain_id join public.stat_sections s on s.id=d.section_id join public.stat_sources source on source.id=v.source_id where v.id=p_id::uuid and v.is_published and v.national_scope and i.is_published and d.is_published and s.is_published and source.is_active and(not i.hide_when_incomplete or i.data_status='complete'));
 elsif p_type='statistic' then return exists(select 1 from public.stat_indicators i join public.stat_domains d on d.id=i.domain_id join public.stat_sections s on s.id=d.section_id where i.id=p_id::uuid and i.is_published and d.is_published and s.is_published and(not i.hide_when_incomplete or i.data_status='complete'));
 elsif p_type='statistic_domain' then return exists(select 1 from public.stat_domains d join public.stat_sections s on s.id=d.section_id where d.id=p_id::uuid and d.is_published and s.is_published);
 end if;return p_known;
end;
$$;
revoke all on function public.editorial_publication(text,text,boolean) from public,anon;
grant execute on function public.editorial_publication(text,text,boolean) to authenticated;
create function public.editorial_current_path(p_type text,p_id text,p_known text) returns text language plpgsql stable security invoker set search_path='' as $$
declare path text;
begin
 if not public.editorial_can_read() then raise exception 'Editor required' using errcode='42501';end if;
 if p_type='statistic_value' then select '/yemen-in-numbers/indicator/'||i.slug into path from public.stat_values v join public.stat_indicators i on i.id=v.indicator_id where v.id=p_id::uuid;return path;end if;return p_known;
end;
$$;
revoke all on function public.editorial_current_path(text,text,text) from public,anon;
grant execute on function public.editorial_current_path(text,text,text) to authenticated;
create function public.editorial_report(p_filters jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; start_at timestamptz; end_at timestamptz; member uuid; section_filter text; action_filter text; query text; page_no int; content_page int; sort_by text;
begin
 if not public.editorial_can_read() then raise exception 'Editorial statistics are restricted to editors' using errcode='42501';end if;
 start_at:=nullif(p_filters->>'from','')::timestamptz;end_at:=nullif(p_filters->>'to','')::timestamptz;
 member:=nullif(p_filters->>'member','')::uuid;section_filter:=nullif(p_filters->>'section','');action_filter:=nullif(p_filters->>'action','');query:=left(coalesce(p_filters->>'q',''),200);
 page_no:=greatest(1,least(100000,coalesce((p_filters->>'page')::int,1)));sort_by:=coalesce(p_filters->>'sort','newest');
 content_page:=greatest(1,least(100000,coalesce((p_filters->>'contentPage')::int,1)));
 if start_at>end_at then raise exception 'Invalid date interval' using errcode='22023';end if;
 with filtered as materialized (
 select c.* from public.editorial_contributions c where c.actor_id is not null and (start_at is null or c.created_at>=start_at) and (end_at is null or c.created_at<end_at) and (member is null or c.actor_id=member) and (section_filter is null or c.section=section_filter) and (action_filter is null or c.action=action_filter) and (query='' or strpos(lower(c.title||' '||c.actor_name||' '||c.content_id),lower(query))>0)
 ), activity as (
 select f.*,public.editorial_current_path(f.content_type,f.content_id,latest.path) current_path,latest.action='delete' deleted,public.editorial_publication(f.content_type,f.content_id,latest.is_published) current_published from filtered f
 cross join lateral (select c.path,c.action,c.is_published from public.editorial_contributions c where c.content_type=f.content_type and c.content_id=f.content_id order by c.created_at desc,c.id desc limit 1) latest
 order by case when sort_by='oldest' then f.created_at end asc,case when sort_by='title' then f.title end asc,case when sort_by='member' then f.actor_name end asc,f.created_at desc,f.id desc limit 40 offset (page_no-1)*40
 ), sections as (select section,count(*) operations,count(distinct(content_type,content_id)) unique_content from filtered group by section),
 daily as (select (created_at at time zone 'Asia/Aden')::date as "day",count(*) operations from filtered group by 1),
 members as (select actor_id id,max(actor_name) name,count(*) operations,count(distinct(content_type,content_id)) unique_content,count(*) filter(where action='create') creates,count(*) filter(where action in ('update','correction')) updates,count(*) filter(where action='publish') publishes,max(created_at) last_activity from filtered group by actor_id),
 content as (select distinct on(content_type,content_id) content_type,content_id,title,path,is_published,action,created_at from filtered order by content_type,content_id,created_at desc,id desc)
 select jsonb_build_object(
 'activatedAt',(select activated_at from public.editorial_audit_activation),
 'summary',(select jsonb_build_object('operations',count(*),'uniqueContent',count(distinct(content_type,content_id)),'members',count(distinct actor_id),'creates',count(*) filter(where action='create'),'publishedCreates',count(*) filter(where action='create' and is_published is true),'updates',count(*) filter(where action in ('update','correction')),'publishes',count(*) filter(where action='publish'),'unpublishes',count(*) filter(where action='unpublish'),'deletes',count(*) filter(where action='delete'),'restores',count(*) filter(where action='restore')) from filtered),
 'sections',coalesce((select jsonb_agg(s order by section) from sections s),'[]'),
 'daily',coalesce((select jsonb_agg(d order by "day") from daily d),'[]'),
 'members',coalesce((select jsonb_agg(m order by name,id) from members m),'[]'),
 'memberOptions',coalesce((select jsonb_agg(m order by name,id) from (select user_id id,display_name name from public.task_team() union all select distinct on(actor_id) actor_id id,actor_name name from public.editorial_contributions where actor_id is not null and actor_id not in(select user_id from public.task_team()) order by id)m),'[]'),
 'activity',coalesce((select jsonb_agg(a) from activity a),'[]'),
 'content',coalesce((select jsonb_agg(c) from (select f.*,public.editorial_current_path(f.content_type,f.content_id,latest.path) current_path,latest.action='delete' deleted,public.editorial_publication(f.content_type,f.content_id,latest.is_published) current_published from content f cross join lateral(select c.path,c.action,c.is_published from public.editorial_contributions c where c.content_type=f.content_type and c.content_id=f.content_id order by created_at desc,id desc limit 1) latest order by f.created_at desc,f.content_id limit 40 offset (content_page-1)*40)c),'[]'),
 'contentPage',content_page,'page',page_no,'pageSize',40) into result;
 return result;
end;
$$;
revoke all on function public.editorial_report(jsonb) from public,anon;
grant execute on function public.editorial_report(jsonb) to authenticated;
commit;
