import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA-wFVq7nvpAlC6ckOmeCsDWX6y_bMvwz8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'studyflow-71cdd.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'studyflow-71cdd',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'studyflow-71cdd.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '356939458433',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:356939458433:web:87e3f633af53c22ec1ea80',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-QS3HG8R6CN',
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export default app
