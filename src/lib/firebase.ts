import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// ⚠️ PASTE YOUR FIREBASE WEB CONFIG HERE.
// Get it from Firebase Console → Project Settings → Your apps → Web app.
// These values are PUBLISHABLE — safe to commit. Firestore security rules
// and Firebase Auth enforce access control, not these keys.
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

export const isFirebaseConfigured = firebaseConfig.apiKey !== "REPLACE_ME";

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

function getOrInit() {
  if (!isFirebaseConfigured) return null;
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
    _auth = getAuth(app);
    _db = getFirestore(app);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  getOrInit();
  if (!_auth) throw new Error("Firebase is not configured. Paste your config in src/lib/firebase.ts");
  return _auth;
}

export function getDb(): Firestore {
  getOrInit();
  if (!_db) throw new Error("Firebase is not configured. Paste your config in src/lib/firebase.ts");
  return _db;
}
