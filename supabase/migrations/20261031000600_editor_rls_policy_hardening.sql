-- Phase 1: preserve the original read rules while evaluating JWT helpers only
-- once per statement. Keep SELECT policies and all user-facing routes unchanged.

alter policy editor_own_drafts on public.editor_drafts
 using (
   owner_id = (select auth.uid())
   and (select public.editorial_can_read())
 );

alter policy editor_message_followups on public.message_followups
 using ((select public.editorial_can_read()));

alter policy profile_read on public.public_profiles
 using (
   user_id = (select auth.uid())
   or (select public.debate_role()) = 'management'
 );

alter policy votes_own_only on public.debate_votes
 using (user_id = (select auth.uid()));

alter policy comments_own_editor on public.debate_comments
 using (
   user_id = (select auth.uid())
   or (select public.debate_role()) is not null
 );

alter policy questions_own_editor on public.debate_questions
 using (
   user_id = (select auth.uid())
   or (select public.debate_role()) is not null
 );

alter policy suggestions_own_editor on public.debate_suggestions
 using (
   user_id = (select auth.uid())
   or (select public.debate_role()) is not null
 );

alter policy reports_read on public.debate_reports
 using (
   user_id = (select auth.uid())
   or (select public.debate_role()) is not null
 );

-- These two indexes have identical definitions and neither backs a
-- constraint. Retain the original poll index and remove the later duplicate.
drop index if exists public.debate_vote_distribution_idx;
