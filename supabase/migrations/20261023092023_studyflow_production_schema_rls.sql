-- Study Flow initial production schema and owner-scoped row-level security.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  class_name text not null default '',
  school text not null default '',
  exam_year integer,
  username text,
  about text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (char_length(full_name) <= 120),
  constraint profiles_username_length check (username is null or char_length(username) between 3 and 32),
  constraint profiles_about_length check (char_length(about) <= 2000),
  constraint profiles_exam_year_range check (exam_year is null or exam_year between 2000 and 2200)
);
create unique index if not exists profiles_username_lower_unique
on public.profiles (lower(username)) where username is not null and username <> '';

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  units integer not null default 1 check (units between 1 and 500),
  topics text not null default '',
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 480),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subjects_name_length check (char_length(btrim(name)) between 1 and 160),
  constraint subjects_topics_length check (char_length(topics) <= 10000)
);
create index if not exists subjects_user_created_idx on public.subjects (user_id, created_at desc);
create unique index if not exists subjects_user_name_unique on public.subjects (user_id, lower(name));

create table if not exists public.time_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  kind text not null check (kind in ('available','blocked')),
  label text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_slots_range_valid check (end_time > start_time),
  constraint time_slots_label_length check (char_length(label) <= 160)
);
create index if not exists time_slots_user_day_start_idx on public.time_slots (user_id, day_of_week, start_time);
create index if not exists time_slots_user_kind_idx on public.time_slots (user_id, kind, day_of_week);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  subject_name text not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  status text not null default 'planned' check (status in ('planned','completed')),
  session_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_sessions_range_valid check (end_time > start_time),
  constraint study_sessions_subject_name_length check (char_length(btrim(subject_name)) between 1 and 160),
  constraint study_sessions_notes_length check (char_length(notes) <= 3000)
);
create index if not exists study_sessions_user_day_start_idx on public.study_sessions (user_id, day_of_week, start_time);
create index if not exists study_sessions_user_date_idx on public.study_sessions (user_id, session_date) where session_date is not null;
create index if not exists study_sessions_user_status_idx on public.study_sessions (user_id, status);

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Weekly study plan',
  plan jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_plans_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint study_plans_plan_size check (pg_column_size(plan) <= 1048576)
);
create index if not exists study_plans_user_updated_idx on public.study_plans (user_id, updated_at desc);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_size check (pg_column_size(preferences) <= 65536)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists subjects_set_updated_at on public.subjects;
create trigger subjects_set_updated_at before update on public.subjects for each row execute function public.set_updated_at();
drop trigger if exists time_slots_set_updated_at on public.time_slots;
create trigger time_slots_set_updated_at before update on public.time_slots for each row execute function public.set_updated_at();
drop trigger if exists study_sessions_set_updated_at on public.study_sessions;
create trigger study_sessions_set_updated_at before update on public.study_sessions for each row execute function public.set_updated_at();
drop trigger if exists study_plans_set_updated_at on public.study_plans;
create trigger study_plans_set_updated_at before update on public.study_plans for each row execute function public.set_updated_at();
drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
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

drop trigger if exists on_auth_user_created_studyflow on auth.users;
create trigger on_auth_user_created_studyflow after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.time_slots enable row level security;
alter table public.study_sessions enable row level security;
alter table public.study_plans enable row level security;
alter table public.user_preferences enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists subjects_select_own on public.subjects;
create policy subjects_select_own on public.subjects for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists subjects_insert_own on public.subjects;
create policy subjects_insert_own on public.subjects for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists subjects_update_own on public.subjects;
create policy subjects_update_own on public.subjects for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists subjects_delete_own on public.subjects;
create policy subjects_delete_own on public.subjects for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists time_slots_select_own on public.time_slots;
create policy time_slots_select_own on public.time_slots for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists time_slots_insert_own on public.time_slots;
create policy time_slots_insert_own on public.time_slots for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists time_slots_update_own on public.time_slots;
create policy time_slots_update_own on public.time_slots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists time_slots_delete_own on public.time_slots;
create policy time_slots_delete_own on public.time_slots for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists study_sessions_select_own on public.study_sessions;
create policy study_sessions_select_own on public.study_sessions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists study_sessions_insert_own on public.study_sessions;
create policy study_sessions_insert_own on public.study_sessions for insert to authenticated with check (
  (select auth.uid()) = user_id
  and (subject_id is null or exists (select 1 from public.subjects s where s.id = subject_id and s.user_id = (select auth.uid())))
);
drop policy if exists study_sessions_update_own on public.study_sessions;
create policy study_sessions_update_own on public.study_sessions for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id
  and (subject_id is null or exists (select 1 from public.subjects s where s.id = subject_id and s.user_id = (select auth.uid())))
);
drop policy if exists study_sessions_delete_own on public.study_sessions;
create policy study_sessions_delete_own on public.study_sessions for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists study_plans_select_own on public.study_plans;
create policy study_plans_select_own on public.study_plans for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists study_plans_insert_own on public.study_plans;
create policy study_plans_insert_own on public.study_plans for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists study_plans_update_own on public.study_plans;
create policy study_plans_update_own on public.study_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists study_plans_delete_own on public.study_plans;
create policy study_plans_delete_own on public.study_plans for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists user_preferences_select_own on public.user_preferences;
create policy user_preferences_select_own on public.user_preferences for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists user_preferences_insert_own on public.user_preferences;
create policy user_preferences_insert_own on public.user_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists user_preferences_update_own on public.user_preferences;
create policy user_preferences_update_own on public.user_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.subjects to authenticated;
grant select, insert, update, delete on public.time_slots to authenticated;
grant select, insert, update, delete on public.study_sessions to authenticated;
grant select, insert, update, delete on public.study_plans to authenticated;
grant select, insert, update on public.user_preferences to authenticated;
revoke all on public.profiles, public.subjects, public.time_slots, public.study_sessions, public.study_plans, public.user_preferences from anon;
