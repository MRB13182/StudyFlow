# Study Flow

Study Flow is a responsive React + TypeScript student planner using Supabase as its only backend.

## Stack
- React + TypeScript + Vite
- Supabase Auth for registration, login, logout, persistent sessions, email confirmation, and password recovery
- Supabase Postgres for profiles, subjects, available/blocked time, study sessions, study plans, and preferences
- Row Level Security (RLS) on every exposed user-data table

## Supabase configuration
The app is preconfigured to use the StudyFlow Supabase project. Optional environment variables can override the defaults:

```dotenv
VITE_SUPABASE_URL=https://vozxngzgtskudloxkxcs.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

The publishable key is a public browser key, not a service-role secret. Never put a Supabase secret or service-role key in frontend code. User data protection relies on database RLS policies.

## Authentication dashboard setup
In Supabase Dashboard → Authentication → URL Configuration:
- Set Site URL to the final deployed website's exact origin.
- Add that origin and the local development URL (for example `http://localhost:5173/**`) to allowed redirects.
- Configure email confirmation, password recovery templates, and SMTP suitable for production.

## Database schema and migrations
The StudyFlow project has `profiles`, `subjects`, `time_slots`, `study_sessions`, `study_plans`, and `user_preferences`. User records are linked to `auth.users`; owner-scoped RLS policies use `auth.uid()`. Constraints, per-user uniqueness, indexes, update timestamps, signup profile creation, database-level overlap checks, and a transactional routine replacement function are included. Applied SQL migrations are tracked in `supabase/migrations/` so the schema changes are reviewable and reproducible.

## No demo data
No demo accounts, demo credentials, sample users, or pre-seeded planner records are created. Each new user starts with an empty planner.

## Run locally
```bash
npm install
npm run dev
npm run build
npm run preview
```

Accounts from a previous authentication provider are not imported automatically; users must register again or be explicitly migrated. Study plans currently use a deterministic scheduling algorithm based on saved data; no external AI service is configured.

Never commit `.env` files containing secrets.
