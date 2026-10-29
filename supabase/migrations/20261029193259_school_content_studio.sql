-- School 967: protected editorial drafts, published versions, question bank and audit.
create table public.school_editor_courses(
 slug text primary key check(slug ~ '^[a-z][a-z0-9-]{2,39}$'),
 draft jsonb not null check(jsonb_typeof(draft)='object'),
 published jsonb check(published is null or jsonb_typeof(published)='object'),
 version integer not null default 1 check(version>=1),
 published_version integer not null default 0,
 updated_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.school_editor_stages(
 course_slug text not null references public.school_editor_courses(slug),
 stage_index integer not null check(stage_index between 0 and 11),
 draft jsonb not null check(jsonb_typeof(draft)='object'),
 published jsonb check(published is null or jsonb_typeof(published)='object'),
 version integer not null default 1 check(version>=1),
 published_version integer not null default 0,
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now(),
 primary key(course_slug,stage_index)
);
create table public.school_editor_questions(
 id uuid primary key default gen_random_uuid(),
 course_slug text not null,
 stage_index integer not null,
 draft jsonb not null check(jsonb_typeof(draft)='object'),
 published jsonb check(published is null or jsonb_typeof(published)='object'),
 version integer not null default 1 check(version>=1),
 published_version integer not null default 0,
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 foreign key(course_slug,stage_index) references public.school_editor_stages(course_slug,stage_index)
);
create index school_editor_questions_stage on public.school_editor_questions(course_slug,stage_index);
create table public.school_editor_audit(
 id bigint generated always as identity primary key,
 actor_id uuid references auth.users(id),
 entity text not null,
 entity_key text not null,
 action text not null,
 before_snapshot jsonb,
 after_snapshot jsonb,
 changed_at timestamptz not null default now()
);
create index school_editor_audit_recent on public.school_editor_audit(changed_at desc,id desc);
alter table public.school_editor_courses enable row level security;
alter table public.school_editor_stages enable row level security;
alter table public.school_editor_questions enable row level security;
alter table public.school_editor_audit enable row level security;
revoke all on table public.school_editor_courses,public.school_editor_stages,public.school_editor_questions,public.school_editor_audit
 from public,anon,authenticated,service_role;
grant select,insert,update on table public.school_editor_courses,public.school_editor_stages,public.school_editor_questions to service_role;
grant select,insert on table public.school_editor_audit to service_role;
create or replace function public.school_editor_audit_change()
returns trigger language plpgsql security invoker set search_path=''
as $func$
declare
 key text;
 kind text;
 activity text;
 old_value jsonb;
begin
 if TG_TABLE_NAME='school_editor_courses' then
  kind:='course'; key:=NEW.slug;
 elsif TG_TABLE_NAME='school_editor_stages' then
  kind:='stage'; key:=NEW.course_slug||':'||NEW.stage_index::text;
 else
  kind:='question'; key:=NEW.course_slug||':'||NEW.stage_index::text||':'||NEW.id::text;
 end if;
 if TG_OP='INSERT' then
  activity:='created'; old_value:=null;
 else
  old_value:=to_jsonb(OLD);
  if OLD.published_version is distinct from NEW.published_version then
   activity:='published';
  else
   activity:='saved';
  end if;
 end if;
 insert into public.school_editor_audit(actor_id,entity,entity_key,action,before_snapshot,after_snapshot)
 values(NEW.updated_by,kind,key,activity,old_value,to_jsonb(NEW));
 return NEW;
end;
$func$;
revoke all on function public.school_editor_audit_change() from public,anon,authenticated;
create trigger school_editor_course_audit after insert or update on public.school_editor_courses
 for each row execute function public.school_editor_audit_change();
create trigger school_editor_stage_audit after insert or update on public.school_editor_stages
 for each row execute function public.school_editor_audit_change();
create trigger school_editor_question_audit after insert or update on public.school_editor_questions
 for each row execute function public.school_editor_audit_change();
-- New authored courses reuse the verified attempt and XP ledger (12 stages max).
alter table public.school_stage_attempts drop constraint school_stage_attempts_course_slug_check;
alter table public.school_stage_attempts add constraint school_stage_attempts_course_slug_check
 check(course_slug ~ '^[a-z][a-z0-9-]{2,39}$');
alter table public.school_xp_events drop constraint school_xp_events_course_slug_check;
alter table public.school_xp_events add constraint school_xp_events_course_slug_check
 check(course_slug ~ '^[a-z][a-z0-9-]{2,39}$');
create or replace function public.school_award_first_pass_xp()
returns trigger language plpgsql security definer set search_path=''
as $func$
begin
 if OLD.status='active' and NEW.status='passed' and NEW.score between 5 and 6
  and NEW.submission is not null and NEW.submitted_at is not null
  and NEW.user_id=OLD.user_id and NEW.course_slug=OLD.course_slug
  and NEW.stage_index=OLD.stage_index
  and (NEW.course_slug in ('musnad','arud') or exists(
    select 1 from public.school_editor_courses c
    where c.slug=NEW.course_slug and c.published is not null)) then
  insert into public.school_xp_events(user_id,course_slug,stage_index,source_attempt_id,xp_amount,earned_at)
  values(NEW.user_id,NEW.course_slug,NEW.stage_index,NEW.id,100,NEW.submitted_at)
  on conflict (user_id,course_slug,stage_index) do nothing;
 end if;
 return NEW;
end;
$func$;
revoke all on function public.school_award_first_pass_xp() from public,anon,authenticated,service_role;
-- Provide editor rows for the existing two courses without changing their runtime content.
insert into public.school_editor_courses(slug,draft,published,version,published_version)
values
 ('musnad','{"title":"خط المسند","description":"تعلّم حروف المسند وقراءة الكلمات وكتابة الجمل.","category":"الكتابة والأدب"}'::jsonb,
  '{"title":"خط المسند","description":"تعلّم حروف المسند وقراءة الكلمات وكتابة الجمل.","category":"الكتابة والأدب"}'::jsonb,1,1),
 ('arud','{"title":"علم العروض","description":"تعلّم التفعيلات والتقطيع وأوزان البحور الستة عشر.","category":"الكتابة والأدب"}'::jsonb,
  '{"title":"علم العروض","description":"تعلّم التفعيلات والتقطيع وأوزان البحور الستة عشر.","category":"الكتابة والأدب"}'::jsonb,1,1);
