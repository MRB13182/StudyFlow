# Study Flow

Study Flow is a responsive React + TypeScript student planner using the supplied purple/blue design. Firebase is connected for **Email/Password Authentication** and optional Analytics only.

## Firebase setup

The web app is configured for Firebase project `studyflow-71cdd` in `src/lib/firebase.ts` using the configuration supplied for this app.

Before testing sign-up/sign-in:

1. Open the [Firebase Console](https://console.firebase.google.com/project/studyflow-71cdd/authentication/providers).
2. Open **Authentication → Sign-in method** and enable **Email/Password**.
3. Under **Authentication → Settings → Authorized domains**, confirm the domain you use to run or host the website is allowed.
4. Run the app locally or deploy it using the instructions below.

Firebase will manage account credentials and the signed-in session. Study Flow does **not** use Firestore or Firebase Storage, and it does **not** save profile information to a database. Profile and planner values are currently held only in React memory and disappear when the page reloads or the session ends.

## Authentication behavior

- Create account: Firebase `createUserWithEmailAndPassword`
- Sign in: Firebase `signInWithEmailAndPassword`
- Sign out: Firebase `signOut`; the public authentication/landing screen is displayed again
- Password reset: Firebase `sendPasswordResetEmail`
- Incorrect login: `Email or password is incorrect`
- Existing email during sign-up: `User already exists. Please sign in`

No demo accounts or demo credentials are created.

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

## Scope / current limitations

- Firebase Authentication is used for user accounts only. There are no Firestore or Storage imports, calls, collections, or uploads.
- The Analytics SDK is initialized only when browser support is available, as in the provided SDK snippet; Analytics is not used for authentication or profile storage.
- The planner, subject list, blocked/available time and routine work in memory for the current page session only and are not persisted.
- Profile editor fields are not saved.
- The study routine generator is a local scheduling algorithm; no external AI model is connected.
- This repository is not automatically deployed. Hosting and Firebase Authentication provider settings must be configured separately.
