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
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGSAP } from "@/lib/gsap";
import { navIntro } from "@/lib/animations";
import { ScrambleText } from "@/components/ScrambleText";
import { useHeadScan } from "@/components/providers/HeadScanProvider";

// Navbar is global (root layout), so the homepage-section links use a "/#anchor"
// form: from any route a native <Link> navigates HOME and then scrolls to the
// anchor (Next.js handles both in one client transition). "Achievements" is now
// its own real route.
//
// Layout: left corner [Contact, About] · centered AH mark · right corner
// [Projects, Achievements].
const LEFT_LINKS = [
  { label: "Contact", href: "/about#contact" },
  { label: "About", href: "/about" },
];
const RIGHT_LINKS = [
  { label: "Projects", href: "/projects" },
  { label: "Achievements", href: "/achievements" },
];

export function Navbar() {
  const root = useRef<HTMLElement>(null);
  const router = useRouter();
  const headScan = useHeadScan();

  // If a HeroHead is mounted on the current page, play its exit scan before
  // navigating; otherwise navigate immediately (default <Link> behavior).
  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Let modified clicks (new tab, etc.) behave natively.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (!headScan.hasMounted()) return;
    e.preventDefault();
    void headScan.playExitAll().then(() => router.push(href));
  };

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
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5 sm:px-10"
    >
      {/* Left corner — Contact, About */}
      <nav className="flex items-center gap-6 sm:gap-8">
        {LEFT_LINKS.map((link) => (
          <Link
            key={link.href}
            data-nav-item
            href={link.href}
            onClick={(e) => handleNav(e, link.href)}
            className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-400 transition-colors hover:text-white sm:text-sm"
          >
            {/* Entrance driven by navIntro (data-nav-item); hover replays. */}
            <ScrambleText>{link.label}</ScrambleText>
          </Link>
        ))}
      </nav>

      {/* Middle — logo mark, absolutely centered so unequal side widths don't
          push it off-center */}
      <Link
        data-nav-item
        href="/"
        aria-label="Home"
        onClick={(e) => handleNav(e, "/")}
        className="absolute left-1/2 -translate-x-1/2"
      >
        <Image
          data-nav-logo
          src="/arif-logo.png"
          alt="Arif Hasan"
          width={56}
          height={56}
          priority
          className="h-11 w-11 object-contain"
        />
      </Link>

      {/* Right corner — Projects, Achievements */}
      <nav className="flex items-center gap-6 sm:gap-8">
        {RIGHT_LINKS.map((link) => (
          <Link
            key={link.href}
            data-nav-item
            href={link.href}
            onClick={(e) => handleNav(e, link.href)}
            className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-400 transition-colors hover:text-white sm:text-sm"
          >
            {/* Entrance driven by navIntro (data-nav-item); hover replays. */}
            <ScrambleText>{link.label}</ScrambleText>
          </Link>
        ))}
      </nav>
    </header>
  );
}
