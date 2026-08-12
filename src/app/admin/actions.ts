"use server";

// -----------------------------------------------------------------------------
// Admin server actions
// -----------------------------------------------------------------------------

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase-admin";
import { SESSION_COOKIE } from "@/lib/admin-auth";

/**
 * Log the admin out: revoke the session server-side (so the cookie can't be
 * replayed even if copied), clear the cookie, and return to the login page.
 * Used as the <form action> of the shell's logout button.
 */
export async function logout() {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  if (session) {
    try {
      const decoded = await adminAuth().verifySessionCookie(session);
      await adminAuth().revokeRefreshTokens(decoded.sub);
    } catch {
      // Already invalid/expired — nothing to revoke.
    }
  }
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}
