import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import {
  SESSION_COOKIE,
  SESSION_EXPIRES_IN_MS,
  sessionCookieOptions,
} from "@/lib/admin-auth";

// -----------------------------------------------------------------------------
// POST /api/admin/session — exchange a freshly-signed-in Firebase ID token for a
// long-lived, httpOnly session cookie. The client login page calls this right
// after signInWithEmailAndPassword. The ID token is verified server-side before
// a session cookie is minted; the cookie is what all /admin/* routes check.
// -----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let idToken: unknown;
  try {
    ({ idToken } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ error: "Missing ID token" }, { status: 400 });
  }

  try {
    // Verify the ID token (fresh sign-in) before minting a durable session cookie.
    await adminAuth().verifyIdToken(idToken);
    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN_MS,
    });
    (await cookies()).set(SESSION_COOKIE, sessionCookie, sessionCookieOptions());
    return NextResponse.json({ status: "ok" });
  } catch {
    // Don't leak which part failed (bad/expired token, revoked, etc.).
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
