-- Phase 3: display deleted / suspended audience profiles without personal identifiers.
-- Keep existing approval-only filters, sorting, pagination and SECURITY DEFINER
-- ownership intact; no votes, comments or user data are modified.
CREATE OR REPLACE FUNCTION public.debate_discussion(p_debate uuid, p_kind text, p_page integer DEFAULT 1, p_order text DEFAULT 'newest'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare items jsonb; total integer; offset_n integer:=greatest(0,least(p_page,10000)-1)*20;
begin
 if not public.debate_visible(p_debate) then return jsonb_build_object('items','[]'::jsonb,'total',0); end if;
 if p_kind='comments' then
 select count(*) into total from public.debate_comments where debate_id=p_debate and status='approved';
 select coalesce(jsonb_agg(v.row),'[]') into items from (
  select jsonb_build_object('id',c.id,'body',c.body,'parent_id',c.parent_id,'created_at',c.created_at,'updated_at',c.updated_at,'pinned',c.pinned_at is not null,'display_name',case when p.deletion_requested_at is not null or coalesce(p.suspended,false) then 'مشارك' else coalesce(nullif(btrim(p.display_name),''),'حساب محذوف') end,'avatar_url',case when p.show_avatar and p.deletion_requested_at is null and not coalesce(p.suspended,false) then p.avatar_url end) row
  from public.debate_comments c left join public.public_profiles p on p.user_id=c.user_id where c.debate_id=p_debate and c.status='approved'
  order by (c.pinned_at is not null) desc,case when p_order='oldest' then c.created_at end asc,case when p_order<>'oldest' then c.created_at end desc,c.id limit 20 offset offset_n) v;
 elsif p_kind='questions' then
 select count(*) into total from public.debate_questions where debate_id=p_debate and status in ('approved','selected','answered');
 select coalesce(jsonb_agg(v.row),'[]') into items from (
  select jsonb_build_object('id',q.id,'body',q.body,'axis',q.axis,'participant_id',q.participant_id,'status',q.status,'created_at',q.created_at,'display_name',case when q.anonymous then 'مشارك' else case when p.deletion_requested_at is not null or coalesce(p.suspended,false) then 'مشارك' else coalesce(nullif(btrim(p.display_name),''),'حساب محذوف') end end) row
  from public.debate_questions q left join public.public_profiles p on p.user_id=q.user_id where q.debate_id=p_debate and q.status in ('approved','selected','answered') order by q.created_at desc,q.id limit 20 offset offset_n) v;
 else raise exception 'Invalid discussion kind' using errcode='22023'; end if;
 return jsonb_build_object('items',items,'total',total,'page',greatest(1,p_page));
end $function$

