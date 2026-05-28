import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// ⚠️ PASTE YOUR FIREBASE WEB CONFIG HERE.
// Get it from Firebase Console → Project Settings → Your apps → Web app.
// These values are PUBLISHABLE — safe to commit. Firestore security rules
// and Firebase Auth enforce access control, not these keys.
const firebaseConfig = {
  apiKey: "AIzaSyCJK5Tb4Ad_WjjxxH0R9AJ5pYVpS_Yhvh0",
  authDomain: "comepassdatabase.firebaseapp.com",
  projectId: "comepassdatabase",
  storageBucket: "comepassdatabase.firebasestorage.app",
  messagingSenderId: "981580546729",
  appId: "1:981580546729:web:fd0bf5ee8c29bf539f5fb8",
  measurementId: "G-CH3MJ0CGHC",
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
