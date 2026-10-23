-- Move all trigger-only functions out of the public API schema.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
drop trigger if exists subjects_set_updated_at on public.subjects;
create trigger subjects_set_updated_at before update on public.subjects
for each row execute function private.set_updated_at();
drop trigger if exists time_slots_set_updated_at on public.time_slots;
create trigger time_slots_set_updated_at before update on public.time_slots
for each row execute function private.set_updated_at();
drop trigger if exists study_sessions_set_updated_at on public.study_sessions;
create trigger study_sessions_set_updated_at before update on public.study_sessions
for each row execute function private.set_updated_at();
drop trigger if exists study_plans_set_updated_at on public.study_plans;
create trigger study_plans_set_updated_at before update on public.study_plans
for each row execute function private.set_updated_at();
drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at before update on public.user_preferences
for each row execute function private.set_updated_at();

revoke all on function public.handle_new_user() from public, anon, authenticated;
drop function if exists public.handle_new_user();
revoke all on function public.set_updated_at() from public, anon, authenticated;
drop function if exists public.set_updated_at();
