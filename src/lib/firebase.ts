import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyA-wFVq7nvpAlC6ckOmeCsDWX6y_bMvwz8',
  authDomain: 'studyflow-71cdd.firebaseapp.com',
  projectId: 'studyflow-71cdd',
  storageBucket: 'studyflow-71cdd.firebasestorage.app',
  messagingSenderId: '356939458433',
  appId: '1:356939458433:web:87e3f633af53c22ec1ea80',
  measurementId: 'G-QS3HG8R6CN',
}

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)

// Analytics is optional; unsupported browsers or blockers must not prevent login.
export const analyticsPromise = isSupported()
  .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
  .catch(() => null)
