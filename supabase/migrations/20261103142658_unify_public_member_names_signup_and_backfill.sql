-- Backfill missing public profiles from the user's entered identity-provider name.
-- Preserve any display names already chosen by members; do not fake debate consent.
INSERT INTO public.public_profiles (user_id, display_name, terms_accepted_at, created_at)
SELECT u.id, pg_catalog.btrim(u.raw_user_meta_data->>'full_name'), NULL, u.created_at
FROM auth.users u
WHERE pg_catalog.length(pg_catalog.btrim(coalesce(u.raw_user_meta_data->>'full_name',''))) BETWEEN 2 AND 60
ON CONFLICT (user_id) DO NOTHING;

-- The same canonical public profile is used for registrations from all providers.
-- First prefer an explicitly chosen display_name, then the provider full_name/name.
-- Debate terms remain independently recorded, never assumed from having a profile.
CREATE OR REPLACE FUNCTION public.debate_profile_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE chosen_name text;
BEGIN
 SELECT candidate.name INTO chosen_name
 FROM (VALUES
   (1,pg_catalog.btrim(coalesce(new.raw_user_meta_data->>'display_name',''))),
   (2,pg_catalog.btrim(coalesce(new.raw_user_meta_data->>'full_name',''))),
   (3,pg_catalog.btrim(coalesce(new.raw_user_meta_data->>'name','')))
 ) AS candidate(priority,name)
 WHERE pg_catalog.length(candidate.name) BETWEEN 2 AND 60
 ORDER BY candidate.priority LIMIT 1;

 IF chosen_name IS NOT NULL THEN
  INSERT INTO public.public_profiles(user_id, display_name, terms_accepted_at, created_at)
  VALUES (
    new.id,chosen_name,
    CASE WHEN new.raw_user_meta_data->>'audience_terms'='true'
      THEN pg_catalog.now() ELSE NULL END,
    coalesce(new.created_at,pg_catalog.now())
  )
  ON CONFLICT (user_id) DO NOTHING;
 END IF;
 RETURN new;
END;
$function$;

-- The trusted auth.users trigger invokes this function; it is not a public RPC.
REVOKE ALL ON FUNCTION public.debate_profile_signup() FROM PUBLIC, anon, authenticated;
