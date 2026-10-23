# Study Flow

A responsive React + TypeScript student planner with the original Study Flow purple/blue visual theme.

## Firebase Authentication setup

The app now uses **Firebase Authentication only**. It does not use Firestore, Realtime Database, or Firebase Storage. Student profile fields, subjects, time slots, and study sessions are deliberately not persisted, as requested.

The Firebase web configuration is in `src/lib/firebase.ts` and reads optional `VITE_FIREBASE_*` overrides from the environment. The supplied project configuration is included as the default.

### Enable email/password sign-in

1. Open the [Firebase Console](https://console.firebase.google.com/) and select project `studyflow-71cdd`.
2. Go to **Authentication → Sign-in method**.
3. Enable **Email/Password**.
4. In **Authentication → Settings → Authorized domains**, ensure your local and deployed domains are allowed.
5. Make sure the project is accessible to you and that the provided configuration belongs to that project.

### Run locally

Requires Node.js LTS.

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## Authentication behavior

- Email/password sign-in with Firebase Authentication.
- Email/password registration; successful signup automatically signs in and opens the dashboard.
- Invalid sign-in credentials show: `Email or password is incorrect`.
- Existing registration email shows: `User already exists. Please sign in`.
- Password reset email uses Firebase Authentication.
- Sign-out calls Firebase Auth and returns to the login screen.
- No default user, demo credentials, test account, or pre-seeded user records.

## Scope notes

This update intentionally does not add profile persistence, Firestore, or Storage. The existing Study Flow visual layout is preserved; non-authentication dashboard sections show empty-state messages because persisting their information is outside the requested scope. Analytics is not initialized because authentication-only mode does not require Firebase Analytics.
