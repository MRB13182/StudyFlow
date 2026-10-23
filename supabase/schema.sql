-- WARNING: Run this SQL in the Supabase SQL Editor for your project before using Study Flow.
-- Tables are scoped to the authenticated user. No demo accounts or sample data are inserted.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  class_name text not null default '',
  school text not null default '',
  exam_year text not null default '',
  username text not null default '',
  about text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username)) where username <> '';

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  units integer not null default 1 check (units >= 1 and units <= 100),
  topics text not null default '',
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 240),
  created_at timestamptz not null default now()
);

create table if not exists public.time_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  kind text not null check (kind in ('available','blocked')),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  subject_name text not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  status text not null default 'planned' check (status in ('planned','completed')),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists subjects_user_id_idx on public.subjects(user_id);
create index if not exists time_slots_user_day_idx on public.time_slots(user_id, day_of_week);
create index if not exists study_sessions_user_day_idx on public.study_sessions(user_id, day_of_week);

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.time_slots enable row level security;
alter table public.study_sessions enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users manage own subjects" on public.subjects;
create policy "Users manage own subjects" on public.subjects for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own time slots" on public.time_slots;
create policy "Users manage own time slots" on public.time_slots for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own study sessions" on public.study_sessions;
create policy "Users manage own study sessions" on public.study_sessions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, class_name, school, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'class_name', ''),
    coalesce(new.raw_user_meta_data ->> 'school', ''),
    coalesce(new.raw_user_meta_data ->> 'username', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_study_flow on auth.users;
create trigger on_auth_user_created_study_flow
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

-- No INSERT statements are included: the database starts empty for real users.
