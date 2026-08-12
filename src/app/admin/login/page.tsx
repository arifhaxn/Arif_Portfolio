"use client";

// -----------------------------------------------------------------------------
// /admin/login — admin sign-in (utility page, deliberately plain)
// -----------------------------------------------------------------------------
// Signs in with the CLIENT Firebase SDK, then hands the resulting ID token to
// /api/admin/session, which mints the httpOnly session cookie the rest of /admin
// checks. No GSAP/scroll — this route lives outside the (site) chrome, so it has
// a normal cursor and native scrolling.
// -----------------------------------------------------------------------------

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(
        firebaseAuth(),
        email.trim(),
        password,
      );
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("session");
      // Navigate to the shell; the server layout picks up the just-set cookie.
      router.replace("/admin");
      router.refresh();
    } catch {
      // Generic message — never reveal which part (email vs password) was wrong.
      setError("Invalid credentials.");
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-neutral-100">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Sign in to manage site content.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6"
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-neutral-400">Email</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-neutral-400">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
