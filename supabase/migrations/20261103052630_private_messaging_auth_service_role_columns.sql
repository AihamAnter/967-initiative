-- Repair private messaging settings on Supabase: PostgreSQL service_role
-- does not have direct SELECT on auth.users by default.
-- Keep the SQL RPC security invoker and grant only the exact fields
-- needed to verify a confirmed, non-banned sender or recipient.
-- No email, tokens, metadata, password fields or complete table SELECT.
grant select (id,email_confirmed_at,banned_until)
on table auth.users to service_role;
