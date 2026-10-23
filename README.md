# Study Flow

Study Flow is a responsive React + TypeScript student planner using the supplied purple/blue visual design. Firebase is connected for **Email/Password Authentication** and optional Analytics only.

## Firebase setup

The web app uses the Firebase project `studyflow-71cdd` configured in `src/lib/firebase.ts`.

Before testing authentication:

1. Open [Firebase Authentication settings](https://console.firebase.google.com/project/studyflow-71cdd/authentication/providers).
2. Enable **Email/Password** under Authentication → Sign-in method.
3. Confirm your localhost and deployed site domains are allowed under Authentication → Settings → Authorized domains.
4. Run locally or deploy using the commands below.

## Authentication behavior

- Sign-up uses Firebase `createUserWithEmailAndPassword`.
- Sign-in uses Firebase `signInWithEmailAndPassword`.
- Successful sign-up and sign-in automatically open the dashboard using Firebase auth state.
- Logout calls Firebase `signOut` and returns to the public authentication/landing screen.
- Password reset requests use Firebase `sendPasswordResetEmail`.
- Incorrect login shows exactly: `Email or password is incorrect`.
- An already-registered email shows exactly: `User already exists. Please sign in`.

No demo accounts or demo credentials are created.

## Data scope

Authentication is the only data service. There are **no Firestore or Firebase Storage imports, calls, collections, or uploads**. Profile fields are not saved. Study subjects, available/blocked periods, and routine sessions exist in React memory for the current page session only and disappear on refresh or when the app is reloaded.

The study routine uses a local scheduling algorithm, not an external AI service.

## Run locally

Requires Node.js and npm.

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

The repository is not automatically deployed; hosting and Firebase Authentication provider settings must be configured separately.
