-- Portable follow-up to 202610220003, which could reject CRLF copies.
-- Apply directly after 202610220002 if 220003 failed, or after a successful
-- 220003. Safe to rerun. No existing post or moderation decision is changed.
begin;

do $portable_publication$
declare definition text; canonical text; fragment_name text; old_pattern text;
 new_pattern text; replacement text; old_matches integer; new_matches integer;
begin
 if to_regprocedure('public.debate_audience_mutate_pre_lifecycle(text,uuid,jsonb)') is null then
  raise exception 'Apply recording lifecycle 202610220002 before this repair';
 end if;
 canonical:=pg_get_functiondef('public.debate_audience_mutate(text,uuid,jsonb)'::regprocedure);
 if position('debate_audience_mutate_pre_lifecycle' in lower(canonical))=0 or position('P0QCL' in canonical)=0 or position('P0VPH' in canonical)=0 then
  raise exception 'Review the current recording lifecycle guard before repairing publication';
 end if;
 definition:=pg_get_functiondef('public.debate_audience_mutate_pre_lifecycle(text,uuid,jsonb)'::regprocedure);
 -- Rewrite only recognized INSERT status and comment edit clauses. Preserve
 -- every other check, return shape and the complete outer lifecycle guard.
 -- Both the old and already-repaired forms are accepted, exactly once each.
 for fragment_name,old_pattern,new_pattern,replacement in select * from (values
  ('comment_insert',$pattern$[iI][nN][sS][eE][rR][tT][[:space:]]*[iI][nN][tT][oO][[:space:]]*[pP][uU][bB][lL][iI][cC][[:space:]]*\.[[:space:]]*[dD][eE][bB][aA][tT][eE]_[cC][oO][mM][mM][eE][nN][tT][sS][[:space:]]*\([[:space:]]*[dD][eE][bB][aA][tT][eE]_[iI][dD][[:space:]]*,[[:space:]]*[uU][sS][eE][rR]_[iI][dD][[:space:]]*,[[:space:]]*[pP][aA][rR][eE][nN][tT]_[iI][dD][[:space:]]*,[[:space:]]*[bB][oO][dD][yY][[:space:]]*\)[[:space:]]*[vV][aA][lL][uU][eE][sS][[:space:]]*\([[:space:]]*[dD][[:space:]]*\.[[:space:]]*[iI][dD][[:space:]]*,[[:space:]]*[uU][[:space:]]*,[[:space:]]*\([[:space:]]*[pP]_[dD][aA][tT][aA][[:space:]]*->>[[:space:]]*'parent_id'[[:space:]]*\)[[:space:]]*::[[:space:]]*[uU][uU][iI][dD][[:space:]]*,[[:space:]]*[pP]_[dD][aA][tT][aA][[:space:]]*->>[[:space:]]*'body'[[:space:]]*\)[[:space:]]*[rR][eE][tT][uU][rR][nN][iI][nN][gG][[:space:]]*[iI][dD][[:space:]]*[iI][nN][tT][oO][[:space:]]*[sS][aA][vV][eE][dD][[:space:]]*;$pattern$,$pattern$[iI][nN][sS][eE][rR][tT][[:space:]]*[iI][nN][tT][oO][[:space:]]*[pP][uU][bB][lL][iI][cC][[:space:]]*\.[[:space:]]*[dD][eE][bB][aA][tT][eE]_[cC][oO][mM][mM][eE][nN][tT][sS][[:space:]]*\([[:space:]]*[dD][eE][bB][aA][tT][eE]_[iI][dD][[:space:]]*,[[:space:]]*[uU][sS][eE][rR]_[iI][dD][[:space:]]*,[[:space:]]*[pP][aA][rR][eE][nN][tT]_[iI][dD][[:space:]]*,[[:space:]]*[bB][oO][dD][yY][[:space:]]*,[[:space:]]*[sS][tT][aA][tT][uU][sS][[:space:]]*\)[[:space:]]*[vV][aA][lL][uU][eE][sS][[:space:]]*\([[:space:]]*[dD][[:space:]]*\.[[:space:]]*[iI][dD][[:space:]]*,[[:space:]]*[uU][[:space:]]*,[[:space:]]*\([[:space:]]*[pP]_[dD][aA][tT][aA][[:space:]]*->>[[:space:]]*'parent_id'[[:space:]]*\)[[:space:]]*::[[:space:]]*[uU][uU][iI][dD][[:space:]]*,[[:space:]]*[pP]_[dD][aA][tT][aA][[:space:]]*->>[[:space:]]*'body'[[:space:]]*,[[:space:]]*'approved'[[:space:]]*\)[[:space:]]*[rR][eE][tT][uU][rR][nN][iI][nN][gG][[:space:]]*[iI][dD][[:space:]]*[iI][nN][tT][oO][[:space:]]*[sS][aA][vV][eE][dD][[:space:]]*;$pattern$,$replacement$insert into public.debate_comments(debate_id,user_id,parent_id,body,status) values(d.id,u,(p_data->>'parent_id')::uuid,p_data->>'body','approved') returning id into saved;$replacement$),
  ('question_insert',$pattern$[iI][nN][sS][eE][rR][tT][[:space:]]*[iI][nN][tT][oO][[:space:]]*[pP][uU][bB][lL][iI][cC][[:space:]]*\.[[:space:]]*[dD][eE][bB][aA][tT][eE]_[qQ][uU][eE][sS][tT][iI][oO][nN][sS][[:space:]]*\([[:space:]]*[dD][eE][bB][aA][tT][eE]_[iI][dD][[:space:]]*,[[:space:]]*[uU][sS][eE][rR]_[iI][dD][[:space:]]*,[[:space:]]*[bB][oO][dD][yY][[:space:]]*,[[:space:]]*[pP][aA][rR][tT][iI][cC][iI][pP][aA][nN][tT]_[iI][dD][[:space:]]*,[[:space:]]*[aA][xX][iI][sS][[:space:]]*,[[:space:]]*[aA][nN][oO][nN][yY][mM][oO][uU][sS][[:space:]]*\)[[:space:]]*[vV][aA][lL][uU][eE][sS][[:space:]]*\([[:space:]]*[dD][[:space:]]*\.[[:space:]]*[iI][dD][[:space:]]*,[[:space:]]*[uU][[:space:]]*,[[:space:]]*[pP]_[dD][aA][tT][aA][[:space:]]*->>[[:space:]]*'body'[[:space:]]*,[[:space:]]*\([[:space:]]*[pP]_[dD][aA][tT][aA][[:space:]]*->>[[:space:]]*'participant_id'[[:space:]]*\)[[:space:]]*::[[:space:]]*[uU][uU][iI][dD][[:space:]]*,[[:space:]]*[cC][oO][aA][lL][eE][sS][cC][eE][[:space:]]*\([[:space:]]*[pP]_[dD][aA][tT][aA][[:space:]]*->>[[:space:]]*'axis'[[:space:]]*,[[:space:]]*''[[:space:]]*\)[[:space:]]*,[[:space:]]*[cC][oO][aA][lL][eE][sS][cC][eE][[:space:]]*\([[:space:]]*\([[:space:]]*[pP]_[dD][aA][tT][aA][[:space:]]*->>[[:space:]]*'anonymous'[[:space:]]*\)[[:space:]]*::[[:space:]]*[bB][oO][oO][lL][eE][aA][nN][[:space:]]*,[[:space:]]*[fF][aA][lL][sS][eE][[:space:]]*\)[[:space:]]*\)[[:space:]]*[rR][eE][tT][uU][rR][nN][iI][nN][gG][[:space:]]*[iI][dD][[:space:]]*[iI][nN][tT][oO][[:space:]]*[sS][aA][vV][eE][dD][[:space:]]*;$pattern$,$pattern$[iI][nN][sS][eE][rR][tT][[:space:]]*[iI][nN][tT][oO][[:space:]]*[pP][uU][bB][lL][iI][cC][[:space:]]*\.[[:space:]]*[dD][eE][bB][aA][tT][eE]_[qQ][uU][eE][sS][tT][iI][oO][nN][sS][[:space:]]*\([[:space:]]*[dD][eE][bB][aA][tT][eE]_[iI][dD][[:space:]]*,[[:space:]]*[uU][sS][eE][rR]_[iI][dD][[:space:]]*,[[:space:]]*[bB][oO][dD][yY][[:space:]]*,[[:space:]]*[pP][aA][rR][tT][iI][cC][iI][pP][aA][nN][tT]_[iI][dD][[:space:]]*,[[:space:]]*[aA][xX][iI][sS][[:space:]]*,[[:space:]]*[aA][nN][oO][nN][yY][mM][oO][uU][sS][[:space:]]*,[[:space:]]*[sS][tT][aA][tT][uU][sS][[:space:]]*\)[[:space:]]*[vV][aA][lL][uU][eE][sS][[:space:]]*\([[:space:]]*[dD][[:space:]]*\.[[:space:]]*[iI][dD][[:space:]]*,[[:space:]]*[uU][[:space:]]*,[[:space:]]*[pP]_[dD][aA][tT][aA][[:space:]]*->>[[:space:]]*'body'[[:space:]]*,[[:space:]]*\([[:space:]]*[pP]_[dD][aA][tT][aA][[:space:]]*->>[[:space:]]*'participant_id'[[:space:]]*\)[[:space:]]*::[[:space:]]*[uU][uU][iI][dD][[:space:]]*,[[:space:]]*[cC][oO][aA][lL][eE][sS][cC][eE][[:space:]]*\([[:space:]]*[pP]_[dD][aA][tT][aA][[:space:]]*->>[[:space:]]*'axis'[[:space:]]*,[[:space:]]*''[[:space:]]*\)[[:space:]]*,[[:space:]]*[cC][oO][aA][lL][eE][sS][cC][eE][[:space:]]*\([[:space:]]*\([[:space:]]*[pP]_[dD][aA][tT][aA][[:space:]]*->>[[:space:]]*'anonymous'[[:space:]]*\)[[:space:]]*::[[:space:]]*[bB][oO][oO][lL][eE][aA][nN][[:space:]]*,[[:space:]]*[fF][aA][lL][sS][eE][[:space:]]*\)[[:space:]]*,[[:space:]]*'approved'[[:space:]]*\)[[:space:]]*[rR][eE][tT][uU][rR][nN][iI][nN][gG][[:space:]]*[iI][dD][[:space:]]*[iI][nN][tT][oO][[:space:]]*[sS][aA][vV][eE][dD][[:space:]]*;$pattern$,$replacement$insert into public.debate_questions(debate_id,user_id,body,participant_id,axis,anonymous,status) values(d.id,u,p_data->>'body',(p_data->>'participant_id')::uuid,coalesce(p_data->>'axis',''),coalesce((p_data->>'anonymous')::boolean,false),'approved') returning id into saved;$replacement$),
  ('comment_edit_policy',$pattern$,[[:space:]]*[sS][tT][aA][tT][uU][sS][[:space:]]*=[[:space:]]*[cC][aA][sS][eE][[:space:]]*[wW][hH][eE][nN][[:space:]]*[bB][oO][dD][yY][[:space:]]*[iI][sS][[:space:]]*[dD][iI][sS][tT][iI][nN][cC][tT][[:space:]]*[fF][rR][oO][mM][[:space:]]*[pP]_[dD][aA][tT][aA][[:space:]]*->>[[:space:]]*'body'[[:space:]]*[tT][hH][eE][nN][[:space:]]*'pending'[[:space:]]*[eE][lL][sS][eE][[:space:]]*[sS][tT][aA][tT][uU][sS][[:space:]]*[eE][nN][dD]$pattern$,$pattern$,[[:space:]]*[sS][tT][aA][tT][uU][sS][[:space:]]*=[[:space:]]*[sS][tT][aA][tT][uU][sS]$pattern$,$replacement$,status=status$replacement$)
 ) as fragments(name,old_sql,new_sql,replacement_sql) loop
  select count(*) into old_matches from regexp_matches(definition,old_pattern,'g');
  select count(*) into new_matches from regexp_matches(definition,new_pattern,'g');
  if old_matches+new_matches<>1 then
   raise exception 'Review audience mutation fragment: %',fragment_name
    using detail=format('Recognized old clauses: %s; repaired clauses: %s; expected total: 1.',old_matches,new_matches),
     hint='No policy change has been committed. Review this clause before applying a different implementation.';
  end if;
  replacement:=replace(replacement,chr(13),'');
  definition:=regexp_replace(definition,old_pattern,replacement,'g');
 end loop;
 execute definition;
end $portable_publication$;

alter table public.debate_comments alter column status set default 'approved';
alter table public.debate_questions alter column status set default 'approved';
revoke all on function public.debate_audience_mutate_pre_lifecycle(text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.debate_audience_mutate(text,uuid,jsonb) from public,anon;
grant execute on function public.debate_audience_mutate(text,uuid,jsonb) to authenticated;

commit;
