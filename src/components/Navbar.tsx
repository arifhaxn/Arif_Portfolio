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
import { usePathname, useRouter } from "next/navigation";
import { useGSAP } from "@/lib/gsap";
import { navIntro } from "@/lib/animations";
import { ScrambleText } from "@/components/ScrambleText";
import { useHeadScan } from "@/components/providers/HeadScanProvider";
import { getLenis } from "@/components/providers/SmoothScrollProvider";

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
  const pathname = usePathname();
  const headScan = useHeadScan();

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Let modified clicks (new tab, etc.) behave natively.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    const hashIdx = href.indexOf("#");
    const path = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
    const hash = hashIdx >= 0 ? href.slice(hashIdx) : "";

    // Already on this route (e.g. About ↔ Contact while on /about): there's no
    // remount or scroll reset, so move to the target section — or the top — via
    // Lenis ourselves. No page-exit scan (nothing is transitioning).
    if (path === pathname) {
      e.preventDefault();
      router.push(href, { scroll: false }); // reflect the URL, don't let Next scroll
      const el = hash ? document.querySelector<HTMLElement>(hash) : null;
      const y = el
        ? Math.max(0, el.getBoundingClientRect().top + window.scrollY - 96)
        : 0;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y);
      else window.scrollTo({ top: y, behavior: "smooth" });
      return;
    }

    // Cross-route: if a HeroHead is mounted, play its exit scan before navigating.
    // #hash targets position themselves on arrival (the About page's hash effect),
    // so they opt out of Next's nav scroll to avoid a flash of the pre-pin spot.
    if (!headScan.hasMounted()) return;
    e.preventDefault();
    void headScan
      .playExitAll()
      .then(() => router.push(href, hash ? { scroll: false } : undefined));
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
