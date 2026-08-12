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

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useGSAP } from "@/lib/gsap";
import { navIntro } from "@/lib/animations";
import { ScrambleText } from "@/components/ScrambleText";
import { useHeadScan } from "@/components/providers/HeadScanProvider";
import { getLenis } from "@/components/providers/SmoothScrollProvider";
import type { NavbarContent } from "@/lib/content-types";

// Navbar is global (root layout), so the homepage-section links use a "/#anchor"
// form: from any route a native <Link> navigates HOME and then scrolls to the
// anchor (Next.js handles both in one client transition). "Achievements" is now
// its own real route.
//
// Content (wordmark + links) is sourced from Firestore (content/navbar) and
// passed in from the server layout. Layout stays: left corner [Contact, About] ·
// centered AH mark · right corner [Projects, Achievements] — the corner is chosen
// by each link's `side`.
export function Navbar({ nav }: { nav: NavbarContent }) {
  const root = useRef<HTMLElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const headScan = useHeadScan();

  const leftLinks = nav.links.filter((l) => l.side === "left");
  const rightLinks = nav.links.filter((l) => l.side === "right");

  // Mobile menu: the four corner links + centered mark don't fit a phone width,
  // so on <sm the links collapse into a toggle that opens a full-screen sheet.
  const [menuOpen, setMenuOpen] = useState(false);

  // Close on Escape + lock body scroll while the sheet is open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

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
    <>
      <header
        ref={root}
        // pt clears the notch/status bar when launched standalone (env() is 0 on
        // desktop + non-notched screens, so the normal 1.25rem spacing is unchanged).
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-10"
      >
        {/* Left corner — Contact, About (desktop only; collapsed into the sheet
            on mobile) */}
        <nav className="hidden items-center gap-6 sm:flex sm:gap-8">
          {leftLinks.map((link) => (
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
          aria-label={nav.wordmark.homeAriaLabel}
          onClick={(e) => handleNav(e, "/")}
          className="absolute left-1/2 -translate-x-1/2"
        >
          <Image
            data-nav-logo
            src={nav.wordmark.logo}
            alt={nav.wordmark.alt}
            width={56}
            height={56}
            priority
            className="h-11 w-11 object-contain"
          />
        </Link>

        {/* Right corner — Projects, Achievements (desktop only) */}
        <nav className="hidden items-center gap-6 sm:flex sm:gap-8">
          {rightLinks.map((link) => (
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

        {/* Mobile menu toggle — replaces the corner links on <sm. ml-auto keeps
            it in the right corner even though the left nav is hidden. */}
        <button
          data-nav-item
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="ml-auto flex h-9 w-9 items-center justify-center text-zinc-300 transition-colors hover:text-white sm:hidden"
        >
          <span className="relative block h-3 w-5">
            <span
              className={`absolute left-0 block h-px w-5 bg-current transition-transform duration-300 ${
                menuOpen ? "top-1/2 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute bottom-0 left-0 block h-px w-5 bg-current transition-transform duration-300 ${
                menuOpen ? "bottom-1/2 -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </header>

      {/* Mobile full-screen sheet — stacked links, blurred backdrop. */}
      <div
        className={`fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-black/90 backdrop-blur-md transition-opacity duration-300 sm:hidden ${
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!menuOpen}
      >
        {nav.links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            tabIndex={menuOpen ? 0 : -1}
            onClick={(e) => {
              setMenuOpen(false);
              handleNav(e, link.href);
            }}
            className="text-2xl font-medium uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </>
  );
}
