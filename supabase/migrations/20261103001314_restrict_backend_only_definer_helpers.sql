-- Applied in Supabase on 2026-11-03 as migration 20261103001314.
-- Restrict helper RPCs that have no direct frontend or RLS use.
-- Their database callers use SECURITY DEFINER, so postgres can still execute.
-- Keep authenticated and anonymous access to documented public debate RPCs.
begin;
revoke execute on function
  public.debate_live_results_visible(uuid),
  public.debate_participation_state(uuid),
  public.debate_visible(uuid),
  public.is_967_editor()
from public, anon, authenticated;
commit;
