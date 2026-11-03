-- Read-only live verification of public/editor SECDEF RPC permissions.
-- Safe to run with elevated SQL editor access. Test transactions are READ ONLY.
-- These tests require neither access tokens nor a real user account.
--
-- Anon must retain published catalog and public RLS boolean guard;
-- backend-only helpers must be inaccessible through PostgREST.
BEGIN READ ONLY;
SET LOCAL ROLE anon;
DO $test$
BEGIN
 IF jsonb_typeof(public.debate_catalog()) IS DISTINCT FROM 'array'
 THEN RAISE EXCEPTION 'Public debate catalog unavailable'; END IF;
 IF public.is_editor() IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'Anonymous editor guard gave access'; END IF;
 IF has_function_privilege(current_user,'public.debate_visible(uuid)','EXECUTE')
 OR has_function_privilege(current_user,'public.debate_live_results_visible(uuid)','EXECUTE')
 OR has_function_privilege(current_user,'public.debate_participation_state(uuid)','EXECUTE')
 OR has_function_privilege(current_user,'public.is_967_editor()','EXECUTE')
 THEN RAISE EXCEPTION 'An internal RPC remains exposed to anon'; END IF;
END $test$;
ROLLBACK;

-- Signed-in role with no JWT must be blocked from admin writes. Publicly
-- published debate read APIs must still work through SECURITY DEFINER callers.
BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE denied boolean:=false; published uuid; catalog jsonb;
BEGIN
 catalog:=public.debate_catalog();
 IF jsonb_typeof(catalog) IS DISTINCT FROM 'array'
 THEN RAISE EXCEPTION 'Published catalog unavailable to signed-in users'; END IF;
 SELECT (entry->>'id')::uuid INTO published
   FROM jsonb_array_elements(catalog) entry WHERE entry ? 'id' LIMIT 1;
 IF published IS NOT NULL THEN
  PERFORM public.debate_live_results(published);
  PERFORM public.debate_discussion(published,'comments',1,'newest');
 END IF;
 BEGIN
  PERFORM public.debate_admin_mutate('save',NULL,NULL,'{}'::jsonb);
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Unauthorized debate editor was not rejected'; END IF;
 IF has_function_privilege(current_user,'public.debate_visible(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'An internal RPC remains exposed to authenticated'; END IF;
END $test$;
ROLLBACK;

-- Catalog report: advisories may remain for intended public-read APIs and
-- RLS/editor helpers. Counts are notices, not confirmed vulnerabilities.
SELECT count(*) AS exposed_secdef_functions,
       count(*) FILTER (WHERE has_function_privilege('anon',p.oid,'EXECUTE')) AS callable_by_anon,
       count(*) FILTER (WHERE has_function_privilege('authenticated',p.oid,'EXECUTE')) AS callable_by_authenticated
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prosecdef
  AND (has_function_privilege('anon',p.oid,'EXECUTE')
       OR has_function_privilege('authenticated',p.oid,'EXECUTE'));
