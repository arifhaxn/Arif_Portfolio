"use client";

// -----------------------------------------------------------------------------
// Navbar
// -----------------------------------------------------------------------------
// Wordmark + nav links that play the "Nav / nameplate intro" on load: each item
// fades in (opacity 0→1) and drops into place (y: -8 → 0), staggered ~0.075s
// apart at 0.7s / power3.out.
//
// It does NOT call gsap directly — it reuses the foundation's `navIntro` helper
// inside a `useGSAP` scope, so timing/easing/stagger stay defined in one place
// (lib/motion) and cleanup is automatic. `navIntro` also handles
// prefers-reduced-motion internally: it snaps items to their final state instead
// of animating.
// -----------------------------------------------------------------------------

import { useRef } from "react";
import { useGSAP } from "@/lib/gsap";
import { navIntro } from "@/lib/animations";

const LINKS = [
  { label: "Projects", href: "#projects" },
  { label: "About", href: "#about" },
  { label: "Playground", href: "#playground" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      // y: -8 → 0 so nav items settle DOWN into place (the spec's "-8" variant).
      // Scoped selector: matches only [data-nav-item] inside this <header>.
      navIntro("[data-nav-item]", -8);
    },
    { scope: root },
  );

  return (
    <header
      ref={root}
      // bg + backdrop-blur: the nav is fixed and content scrolls beneath it —
      // without a backdrop, wireframe edges from the 3D canvases show through
      // between the links and read as stray diagonal lines across the nav.
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-black/70 px-6 py-5 backdrop-blur-md sm:px-10"
    >
      {/* Logo mark — text initials, first item in the stagger */}
      <a
        data-nav-item
        href="#"
        className="text-sm font-semibold tracking-[0.2em] text-white"
      >
        AH
      </a>

      {/* Nav links — each its own stagger step */}
      <nav className="flex items-center gap-6 sm:gap-8">
        {LINKS.map((link) => (
          <a
            key={link.href}
            data-nav-item
            href={link.href}
            className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-400 transition-colors hover:text-white sm:text-sm"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
