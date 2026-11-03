-- Show users in the private-message directory by default.
-- A saved false value remains an explicit, enforceable opt-out.
alter table public.private_messaging_settings alter column discoverable set default true;
