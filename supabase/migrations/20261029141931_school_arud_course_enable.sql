-- Extend the existing private School 967 attempt store without changing Musnad data.
alter table public.school_stage_attempts drop constraint if exists school_stage_attempts_course_slug_check;
alter table public.school_stage_attempts add constraint school_stage_attempts_course_slug_check
  check (course_slug in ('musnad','arud'));
comment on table public.school_stage_attempts is
  'Server-graded learning attempts for Musnad and Arabic prosody, isolated by course_slug; protected from browser access.';
