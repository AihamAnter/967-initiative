-- Set genuine calligraphy hand on all 12 version-2 published stages without
-- rewriting lesson content, student results, attempts, or answer keys.
-- Legacy IBM Plex Sans Arabic remains the interface typeface.
do $script_metadata$
declare n integer;
begin
 with named(stage_index,hand) as (
  values (0,'naskh'),
  (1,'naskh'),
  (2,'naskh'),
  (3,'naskh'),
  (4,'ruqah'),
  (5,'ruqah'),
  (6,'kufi'),
  (7,'thuluth'),
  (8,'diwani'),
  (9,'nastaliq'),
  (10,'maghribi'),
  (11,'naskh')
 ), changed as (
  update public.school_editor_stages s
  set draft=jsonb_set(jsonb_set(s.draft,'{script}',to_jsonb(named.hand),true),
        '{practice,script}',to_jsonb(named.hand),true),
      published=jsonb_set(jsonb_set(s.published,'{script}',to_jsonb(named.hand),true),
        '{practice,script}',to_jsonb(named.hand),true),
      version=s.version+1,
      published_version=s.published_version+1,
      updated_at=now()
  from named
  where s.course_slug='arabic-calligraphy'
    and s.stage_index=named.stage_index
    and s.version=2 and s.published_version=2
    and s.draft=s.published
    and not (s.published ? 'script')
  returning s.stage_index
 )
 select count(*) into n from changed;
 if n<>12 then raise exception 'Calligraphy scripts require 12 unmodified v2 stages; got %',n; end if;
end
$script_metadata$;
