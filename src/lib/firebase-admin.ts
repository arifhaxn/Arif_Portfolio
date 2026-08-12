import "server-only";

// -----------------------------------------------------------------------------
// firebase-admin — server-side Firebase SDK (the ONLY way the app touches data)
// -----------------------------------------------------------------------------
// Every Firestore/Storage read on public pages (Server Components) and every
// admin write (Server Actions/API routes, Phase 3) goes through this. It is
// initialized from SERVICE ACCOUNT env vars — never from the client web config,
// and never imported into a Client Component (`server-only` above enforces that:
// importing this from client code is a build error).
//
// Init is LAZY + memoized: the Admin app is created on first use, not at module
// load, so importing this file in an environment without credentials (e.g. a
// typecheck) doesn't throw — only actually reading data does.
// -----------------------------------------------------------------------------

import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

const ADMIN_APP_NAME = "portfolio-admin";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required env var ${name}. Copy .env.local.example to .env.local and fill in the Firebase service account credentials.`,
    );
  }
  return v;
}

/** Create (or reuse) the named firebase-admin app from service account env vars. */
function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === ADMIN_APP_NAME);
  if (existing) return existing;

  // The private key is stored in the env var with newlines escaped as literal
  // "\n" (a single-line value); turn those back into real newlines for the PEM.
  const privateKey = requireEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(
    /\\n/g,
    "\n",
  );

  return initializeApp(
    {
      credential: cert({
        projectId: requireEnv("FIREBASE_ADMIN_PROJECT_ID"),
        clientEmail: requireEnv("FIREBASE_ADMIN_CLIENT_EMAIL"),
        privateKey,
      }),
      storageBucket:
        process.env.FIREBASE_ADMIN_STORAGE_BUCKET ??
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    },
    ADMIN_APP_NAME,
  );
}

/** Server-side Auth instance — mints/verifies the admin session cookie. */
export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

/** Server-side Firestore instance. */
export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}

/** Server-side Storage instance. */
export function adminStorage(): Storage {
  return getStorage(getAdminApp());
}
