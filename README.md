# Study Flow

Study Flow is a responsive React + TypeScript student planner using Supabase as its only backend.

## Stack
- React + TypeScript + Vite
- Supabase Auth for registration, login, logout, persistent sessions, email confirmation, and password recovery
- Supabase Postgres for profiles, subjects, available/blocked time, study sessions, study plans, and preferences
- Row Level Security (RLS) on all exposed user-data tables

## Supabase configuration
Create a local `.env` file (not committed) or set these variables in your hosting provider:

```dotenv
VITE_SUPABASE_URL=https://vozxngzgtskudloxkxcs.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

The publishable key is intended for browser clients. Never place a Supabase secret or service-role key in frontend code.

## Authentication dashboard setup
In Supabase Dashboard → Authentication → URL Configuration:
- Set Site URL to the deployed website's exact origin.
- Add the production origin and local development URL (for example `http://localhost:5173/**`) to allowed redirects.
- Configure email confirmation and password recovery templates/SMTP as needed.

## Database schema
The StudyFlow project includes `profiles`, `subjects`, `time_slots`, `study_sessions`, `study_plans`, and `user_preferences`. Owner-scoped RLS policies use `auth.uid()`; validation constraints, indexes, timestamps, and per-user uniqueness constraints are included.

## No demo data
No demo accounts, credentials, sample users, or seeded planner records are created. New users start with an empty planner.

## Run locally
```bash
npm install
npm run dev
npm run build
npm run preview
```

Accounts from the former authentication provider are not automatically transferred; those users must register again or be explicitly migrated. The planner uses a deterministic scheduling algorithm based on saved data; no external AI service is configured.

Never commit `.env` or server-side secrets.
