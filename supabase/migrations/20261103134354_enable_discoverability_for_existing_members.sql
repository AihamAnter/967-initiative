-- One-time enrollment of the existing users into the search directory.
-- Preserve separate allow_requests and notify_messages choices.
-- Later user opt-outs (discoverable=false) are still honored.
INSERT INTO public.private_messaging_settings (user_id, discoverable)
SELECT id, TRUE FROM auth.users
ON CONFLICT (user_id)
DO UPDATE SET discoverable = EXCLUDED.discoverable
WHERE public.private_messaging_settings.discoverable IS DISTINCT FROM EXCLUDED.discoverable;
