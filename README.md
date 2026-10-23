# Study Flow

Study Flow is a responsive React + TypeScript student planner using **Supabase only** as its backend. The existing design and styling are kept intact.

## Stack
- React + TypeScript + Vite
- Supabase Auth for registration, login, logout, persistent sessions, email confirmation, and password recovery
- Supabase Postgres for profiles, subjects, available/blocked time, and study sessions
- Row Level Security (RLS) on user-owned tables
- No Firebase Authentication, Firestore, or Firebase Storage

## Supabase configuration
The client is pinned to the StudyFlow Supabase project and its public publishable key in `src/lib/supabase.ts`. A publishable/anon key is intended for browser use; never put a service-role or secret key in frontend code. Data access must be protected by database RLS.

## Authentication dashboard setup
In Supabase Dashboard → Authentication → URL Configuration:
- Set Site URL to the final deployed website origin.
- Add that origin and your local development URL to the allowed redirect URLs.
- Configure email confirmation and password-recovery settings/SMTP.

## Database
The connected project contains `profiles`, `subjects`, `time_slots`, `study_sessions`, `study_plans`, and `user_preferences`. Owner-scoped RLS policies use `auth.uid()`. Database migrations live in `supabase/migrations/`.

New users start with an empty planner; no demo accounts or fake planner data are inserted.

## Run locally
```bash
npm install
npm run dev
npm run build
npm run preview
```

Study plans use a deterministic local scheduling algorithm over the user's saved subject and time-slot data. No external AI model is connected.
