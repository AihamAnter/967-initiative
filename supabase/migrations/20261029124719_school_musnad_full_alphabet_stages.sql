-- Preserve completed stages 0-2 while enabling the full 12-stage Musnad course.
alter table public.school_stage_attempts
 drop constraint if exists school_stage_attempts_stage_index_check;
alter table public.school_stage_attempts
 add constraint school_stage_attempts_stage_index_check
 check (stage_index between 0 and 11);
