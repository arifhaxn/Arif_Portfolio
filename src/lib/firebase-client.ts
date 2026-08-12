"use client";

// -----------------------------------------------------------------------------
// firebase-client — client-side Firebase SDK, ADMIN LOGIN PAGE ONLY
// -----------------------------------------------------------------------------
// This is the ONLY place the browser-facing Firebase SDK is used. Its single job
// (Phase 3) is to sign the admin in on the login page with email/password; the
// resulting ID token is then exchanged, server-side, for an httpOnly session
// cookie (`createSessionCookie`), and every subsequent auth check verifies that
// cookie via firebase-admin. No public page imports this, and no Firestore/
// Storage access ever happens through the client SDK — those are server-only
// (see firebase-admin.ts).
//
// The config values are the NEXT_PUBLIC_* web-app keys, which are public by
// design (Firebase security is enforced by Auth + Firestore rules, not by hiding
// these). Init is memoized so React fast-refresh / repeated imports reuse one app.
// -----------------------------------------------------------------------------

import { getApps, getApp, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getClientApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

/** Client-side Auth instance — used only to sign the admin in on the login page. */
export function firebaseAuth(): Auth {
  return getAuth(getClientApp());
}
