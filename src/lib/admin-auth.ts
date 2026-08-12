import "server-only";

// -----------------------------------------------------------------------------
// admin-auth — server-side session-cookie helpers for the /admin app
// -----------------------------------------------------------------------------
// The admin signs in on the client (firebase-client), gets a Firebase ID token,
// and POSTs it to /api/admin/session. That route mints a long-lived SESSION
// COOKIE via firebase-admin (createSessionCookie) and stores it httpOnly. Every
// /admin/* request then verifies that cookie server-side (verifySessionCookie) —
// the ID token itself is never trusted from the browser after login.
//
// There is exactly one admin account, so a valid, non-revoked session cookie is
// sufficient authorization — no roles/claims to check.
// -----------------------------------------------------------------------------

import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

/** Session cookie name. */
export const SESSION_COOKIE = "session";

/** How long the session cookie stays valid (Firebase max is 14 days). */
export const SESSION_EXPIRES_IN_MS = 60 * 60 * 24 * 5 * 1000; // 5 days
const SESSION_MAX_AGE_S = Math.floor(SESSION_EXPIRES_IN_MS / 1000);

/** Cookie attributes for the session cookie (shared by set + clear). */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    // localhost dev is http, where `secure` cookies are dropped — only require it
    // in production (HTTPS).
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  };
}

/**
 * Verify the current request's session cookie. Returns the decoded claims for a
 * valid, non-revoked session, or null otherwise (missing / invalid / expired /
 * revoked). Used by the admin layout to gate every /admin/* route.
 */
export async function getVerifiedAdmin() {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    // checkRevoked=true so a logged-out (token-revoked) session is rejected.
    return await adminAuth().verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}
