-- Hide trigger internals in the private schema and atomically replace a user's planned sessions.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'username', ''), '')
  )
  on conflict (id) do nothing;
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_studyflow on auth.users;
create trigger on_auth_user_created_studyflow after insert on auth.users
for each row execute function private.handle_new_user();

create index if not exists study_sessions_subject_id_idx
on public.study_sessions(subject_id) where subject_id is not null;

create or replace function public.replace_planned_study_sessions(p_sessions jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  item jsonb;
  active_user uuid;
  subject_uuid uuid;
begin
  active_user := auth.uid();
  if active_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_sessions is null or jsonb_typeof(p_sessions) is distinct from 'array' then
    raise exception 'Study sessions must be supplied as a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_sessions) > 35 then
    raise exception 'A weekly plan cannot exceed 35 study sessions' using errcode = '22023';
  end if;

  delete from public.study_sessions
  where user_id = active_user and status = 'planned';

  for item in select value from jsonb_array_elements(p_sessions)
  loop
    subject_uuid := nullif(item ->> 'subject_id', '')::uuid;
    if subject_uuid is null or not exists (
      select 1 from public.subjects s where s.id = subject_uuid and s.user_id = active_user
    ) then
      raise exception 'Every planned session must reference one of your subjects' using errcode = '42501';
    end if;

    insert into public.study_sessions (
      user_id, subject_id, subject_name, day_of_week, start_time, end_time, status
    ) values (
      active_user, subject_uuid, item ->> 'subject_name',
      (item ->> 'day_of_week')::smallint, (item ->> 'start_time')::time,
      (item ->> 'end_time')::time, 'planned'
    );
  end loop;
end;
$$;
revoke all on function public.replace_planned_study_sessions(jsonb) from public, anon;
grant execute on function public.replace_planned_study_sessions(jsonb) to authenticated;
