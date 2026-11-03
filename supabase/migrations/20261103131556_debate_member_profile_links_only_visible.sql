-- Make authors of visible debate posts linkable without identifying anonymous authors.
-- Retain the existing function's publication guards and privileges.
do $migration$
declare definition text;
begin
 select pg_catalog.pg_get_functiondef(p.oid) into definition
 from pg_catalog.pg_proc p where p.pronamespace='public'::regnamespace
 and p.proname='debate_discussion' limit 1;
 if definition is null
  or position('''id'',c.id,''body''' in definition)=0
  or position('''id'',q.id,''body''' in definition)=0 then
  raise exception 'debate_discussion SQL is unexpectedly different; refusing migration';
 end if;
 definition=replace(definition,'''id'',c.id,''body''',
  '''id'',c.id,''member_id'',case when p.user_id is not null and p.deletion_requested_at is null and not coalesce(p.suspended,false) then c.user_id end,''body''');
 definition=replace(definition,'''id'',q.id,''body''',
  '''id'',q.id,''member_id'',case when not q.anonymous and p.user_id is not null and p.deletion_requested_at is null and not coalesce(p.suspended,false) then q.user_id end,''body''');
 execute definition;
end $migration$;