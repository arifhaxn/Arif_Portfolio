// -----------------------------------------------------------------------------
// Admin (dashboard) layout — auth guard + persistent shell
// -----------------------------------------------------------------------------
// This layout wraps every protected admin route (everything under the
// (dashboard) group: /admin and /admin/<section>). It does NOT wrap
// /admin/login, which is a sibling of this group — so there's no redirect loop.
//
// On every request it verifies the session cookie server-side (firebase-admin).
// A missing/invalid/expired/revoked session redirects to /admin/login. One admin
// account, so a valid session is sufficient — no role checks.
// -----------------------------------------------------------------------------

import { redirect } from "next/navigation";
import { getVerifiedAdmin } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { logout } from "@/app/admin/actions";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getVerifiedAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <AdminSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-3">
          <span className="text-sm text-neutral-500">Content admin</span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
            >
              Log out
            </button>
          </form>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
