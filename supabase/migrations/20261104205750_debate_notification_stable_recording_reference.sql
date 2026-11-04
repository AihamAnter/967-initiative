-- A legacy/partially published recording can lack recording_first_published_at.
-- A stable fallback prevents duplicate alerts if admins later edit metadata.
CREATE OR REPLACE FUNCTION public.debate_dispatch_notifications()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 v_count integer:=0;
begin
 with events as (
   -- Announcements are strictly opt-in; setting the switch never backfills
   -- debates that were already published.
   select ap.user_id,d.id debate_id,'announced'::text event_key,d.first_published_at reference_at
   from public.account_preferences ap
   join public.debates d
    on d.first_published_at is not null
    and d.first_published_at>=ap.notify_new_debates_since
   where ap.notify_new_debates_since is not null
    and d.first_published_at>=now()-interval '7 days'
    and d.publication_status='published'
    and d.stage not in ('cancelled','postponed')

   union all

   -- A planned *live broadcast* date is an event time; planned recording
   -- publication dates are NOT guaranteed release times, so never notify
   -- as though a prerecording is already available.
   select s.user_id,d.id,'before_24h',d.scheduled_at
   from public.debate_notification_subscriptions s
   join public.debates d on d.id=s.debate_id
   where d.debate_type='external_live'
    and d.publication_status='published'
    and d.stage in ('announced','upcoming')
    and d.scheduled_at>now()+interval '23 hours 40 minutes'
    and d.scheduled_at<=now()+interval '24 hours'

   union all
   select s.user_id,d.id,'before_1h',d.scheduled_at
   from public.debate_notification_subscriptions s
   join public.debates d on d.id=s.debate_id
   where d.debate_type='external_live'
    and d.publication_status='published'
    and d.stage in ('announced','upcoming')
    and d.scheduled_at>now()+interval '40 minutes'
    and d.scheduled_at<=now()+interval '1 hour'

   union all
   select s.user_id,d.id,'recording',
     coalesce(d.recording_first_published_at,d.first_published_at,'1970-01-01 00:00:00+00'::timestamptz)
   from public.debate_notification_subscriptions s
   join public.debates d on d.id=s.debate_id
   where d.debate_type='prerecorded'
    and d.publication_status='published'
    and d.recording_published=true
    and d.recording_url like 'https://%'
    and d.stage not in ('cancelled','postponed')

   union all
   select s.user_id,d.id,'postponed','1970-01-01 00:00:00+00'::timestamptz
   from public.debate_notification_subscriptions s
   join public.debates d on d.id=s.debate_id
   where d.publication_status='published' and d.stage='postponed'

   union all
   select s.user_id,d.id,'cancelled','1970-01-01 00:00:00+00'::timestamptz
   from public.debate_notification_subscriptions s
   join public.debates d on d.id=s.debate_id
   where d.publication_status='published' and d.stage='cancelled'
 ), eligible as (
   select e.user_id,e.debate_id,e.event_key,e.reference_at
   from events e
   where not exists(
    select 1 from public.debate_notification_deliveries x
    where x.user_id=e.user_id and x.debate_id=e.debate_id
     and x.event_key=e.event_key and x.reference_at=e.reference_at
   )
   order by reference_at,user_id
   limit 400
 ), inserted as (
   insert into public.debate_notification_deliveries
    (user_id,debate_id,event_key,reference_at)
   select user_id,debate_id,event_key,reference_at from eligible
   on conflict do nothing
   returning user_id,debate_id,event_key,reference_at
 ), notices as (
   insert into public.account_notifications(user_id,kind,title,description,href)
   select i.user_id,'debate',
    left(case i.event_key
     when 'announced' then 'مناظرة جديدة: '||d.title
     when 'before_24h' then 'غدًا: '||d.title
     when 'before_1h' then 'اقترب موعد المناظرة: '||d.title
     when 'recording' then 'تسجيل المناظرة متاح: '||d.title
     when 'postponed' then 'تأجيل المناظرة: '||d.title
     else 'إلغاء المناظرة: '||d.title end,180),
    case i.event_key
     when 'announced' then 'أعلنت مبادرة 967 عن مناظرة جديدة. اطلع على الموضوع والموعد.'
     when 'before_24h' then 'تبقى نحو 24 ساعة على البث الخارجي للمناظرة.'
     when 'before_1h' then 'تبقى نحو ساعة على البث الخارجي للمناظرة.'
     when 'recording' then 'نُشر تسجيل المناظرة وأصبح متاحًا للمشاهدة.'
     when 'postponed' then 'أُجّلت المناظرة. سيُعلن الموعد الجديد عند تحديده.'
     else 'ألغيت المناظرة. لا يوجد موعد بث قائم.' end,
    '/debates/'||d.slug
   from inserted i join public.debates d on d.id=i.debate_id
   returning id
 )
 select count(*) into v_count from notices;
 return v_count;
end;
$function$;
revoke all on function public.debate_dispatch_notifications()
 from public,anon,authenticated;
