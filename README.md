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
- Set Site URL to the canonical deployed website origin (scheme + hostname only).
- Add the canonical origin to allowed redirect URLs. Also add `http://localhost:3000/**` for local development and any exact production/preview origins where you intend to test.
- If the canonical origin differs from the browser's current origin, set `VITE_SITE_URL` to that canonical origin at build time. Otherwise the app uses `window.location.origin`.
- Under Authentication → Providers → Email, enable email signups and confirm-email as required for production.
- Under Authentication → SMTP Settings, configure a verified custom SMTP provider for production. The built-in email service is rate-limited and intended for testing.
- Under Authentication → Email Templates, confirm the confirmation link points to `{{ .RedirectTo }}` (or to the intended canonical URL), since the app supplies an explicit email redirect.
- After configuration, test registration with an inbox you control, open the confirmation link, verify the browser returns to Study Flow, then log in. Test password recovery separately.

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
