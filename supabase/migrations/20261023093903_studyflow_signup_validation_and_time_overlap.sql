-- Defensive signup metadata handling and database-enforced time-slot overlap prevention.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  requested_username := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')), '');
  if requested_username is not null and char_length(requested_username) not between 3 and 32 then
    requested_username := null;
  end if;

  begin
    insert into public.profiles (id, full_name, class_name, school, username)
    values (
      new.id,
      left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
      left(coalesce(new.raw_user_meta_data ->> 'class_name', ''), 160),
      left(coalesce(new.raw_user_meta_data ->> 'school', ''), 200),
      requested_username
    )
    on conflict (id) do nothing;
  exception when unique_violation then
    insert into public.profiles (id, full_name, class_name, school, username)
    values (
      new.id,
      left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
      left(coalesce(new.raw_user_meta_data ->> 'class_name', ''), 160),
      left(coalesce(new.raw_user_meta_data ->> 'school', ''), 200),
      null
    )
    on conflict (id) do nothing;
  end;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create or replace function public.prevent_time_slot_overlap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.user_id::text || ':' || new.day_of_week::text || ':' || new.kind, 0)
  );
  if exists (
    select 1 from public.time_slots s
    where s.user_id = new.user_id
      and s.day_of_week = new.day_of_week
      and s.kind = new.kind
      and s.id is distinct from new.id
      and s.start_time < new.end_time
      and s.end_time > new.start_time
  ) then
    raise exception 'This time slot overlaps an existing period of the same type for this day'
      using errcode = '23P01';
  end if;
  return new;
end;
$$;
revoke all on function public.prevent_time_slot_overlap() from public, anon, authenticated;
drop trigger if exists time_slots_prevent_overlap on public.time_slots;
create trigger time_slots_prevent_overlap
before insert or update of user_id, day_of_week, start_time, end_time, kind
on public.time_slots
for each row execute function public.prevent_time_slot_overlap();
