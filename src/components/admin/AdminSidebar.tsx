"use client";

// -----------------------------------------------------------------------------
// AdminSidebar — left nav of the admin shell, one item per content document
// -----------------------------------------------------------------------------
// Client component only so it can highlight the active section via usePathname.
// The section list itself is shared data (lib/admin-sections).
// -----------------------------------------------------------------------------

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_SECTIONS } from "@/lib/admin-sections";

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-6 px-2 text-sm font-semibold tracking-tight text-neutral-200">
        Arif — Admin
      </div>
      <nav className="flex flex-col gap-1">
        {ADMIN_SECTIONS.map((s) => {
          const href = `/admin/${s.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={s.slug}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
