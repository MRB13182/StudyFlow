-- Allow Supabase Auth's database role to insert rows via the SECURITY DEFINER signup trigger.
-- Keep the grants narrowly scoped to the two tables written by private.handle_new_user().
grant insert, select on table public.profiles to supabase_auth_admin;
grant insert, select on table public.user_preferences to supabase_auth_admin;
