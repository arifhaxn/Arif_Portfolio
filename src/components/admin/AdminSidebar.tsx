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
    // Mobile: a full-width bar that scrolls its section chips horizontally, sitting
    // above the content. lg+: the original fixed vertical sidebar.
    <aside className="shrink-0 border-b border-neutral-800 bg-neutral-900 lg:w-56 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 p-3 lg:flex-col lg:items-stretch lg:gap-0 lg:p-4">
        <div className="shrink-0 px-1 text-sm font-semibold tracking-tight text-neutral-200 lg:mb-6 lg:px-2">
          Arif — Admin
        </div>
        <nav className="flex flex-1 gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {ADMIN_SECTIONS.map((s) => {
            const href = `/admin/${s.slug}`;
            const active = pathname === href;
            return (
              <Link
                key={s.slug}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors lg:shrink ${
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
      </div>
    </aside>
  );
}
