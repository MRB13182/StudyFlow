# Study Flow

Study Flow is a responsive React + TypeScript student planner styled from the supplied purple/blue visual reference. It includes account registration and login, email password-reset links, a profile, subject management, available/blocked time, weekly routine generation, completion tracking, and settings.

## Important: services must be configured

This repository contains no demo accounts and does not seed fake data. Auth and storage are intentionally disabled until you connect a Supabase project.

### 1. Create a Supabase project

Create a project in Supabase, then open **SQL Editor** and run the complete contents of [`supabase/schema.sql`](./supabase/schema.sql). It creates the profile, subjects, time-slot, and study-session tables, ownership policies, and profile creation trigger. Row Level Security restricts each account to its own records.

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and set:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Use the Supabase project's publishable/anon key only; never put a service-role key in the browser. In deployment, add the same values as environment variables in your hosting provider. Do not commit `.env.local`.

### 3. Configure authentication

In Supabase Authentication settings:
- Configure the site URL for your deployed site.
- Add your local development URL and deployed URL to allowed redirect URLs.
- Configure email verification and an email provider as appropriate.
- Customize verification and password-reset email templates if needed.

A reset link is sent via Supabase Auth. Public responses do not reveal whether an email address belongs to an account.

### 4. Run locally

Requires a current Node.js LTS release.

```bash
npm install
cp .env.example .env.local
# Update .env.local with your Supabase values
npm run dev
```

To create a production build:

```bash
npm run build
npm run preview
```

## Features

- Responsive public landing page and real registration/login forms
- No default account, demo credentials, mock user, or seeded example subjects
- Supabase Auth session persistence and email reset flow
- Account-owned profile, subjects, available time, blocked time, and study sessions
- Weekly routine generation based on saved subjects and time slots, skipping known blocked periods
- Session completion stored against the authenticated account
- Responsive dashboard, collapsible mobile navigation, empty/loading/error states

## Current limitations

- “AI Study Plan” currently uses a deterministic local scheduling algorithm; no AI provider/API has been connected yet. It does not claim that an LLM generated the plan.
- This is a deployable starter, not an already deployed website. Supabase credentials, schema setup, email delivery, and hosting still need to be configured and tested in your own accounts.
- The routine generator replaces previously planned (not completed) sessions; completed sessions are preserved.
- The current routine view is a weekly, click-to-complete calendar. Drag-and-drop rescheduling, notifications, and recurring streak calculations are not included.

## Security notes

The frontend only uses the Supabase publishable/anon key. Database RLS protects rows by authenticated user ID. Never expose a Supabase service-role key in client code. For public production deployment, set appropriate email rate limits and URL allow-lists in Supabase and confirm password recovery works on the deployed domain.
