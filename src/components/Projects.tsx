"use client";

// -----------------------------------------------------------------------------
// Projects — pinned, scroll-scrubbed marquee list
// -----------------------------------------------------------------------------
// Desktop (lg+):
//   • The left column is a tall stack of large project-name rows. Each row runs
//     `marqueeRowFocus`: a scrubbed dim → bright → dim tween, so the row nearest
//     the viewport center is white/full-opacity and everything else is gray —
//     a gradual scrub (0.4), not an on/off switch.
//   • The reused <HeroHead> wireframe polyhedron sits BEHIND the whole section
//     as a large ambient background layer: a sticky, viewport-centered element
//     (z-0, pointer-events-none, dimmed) under the text/cards (z-10). It zooms
//     in (scale 0.6 → 1, fade to its resting opacity) once when the section
//     enters, then mouse-tracking rotation keeps running on it. CSS sticky does
//     the centering, so it can't interfere with the ScrollTrigger pin.
//   • The right column is PINNED for the whole section (ScrollTrigger pin) and
//     holds the stack of project cards (thumbnail + meta + GitHub link).
//   • Per-row "active zone" triggers (callbacks only, no tween) track which row
//     sits in the center band; on change, the old card exits and the new one
//     enters via the foundation's `thumbRailSwap` (y ±20 opacity crossfade,
//     0.375s, power2.in/out). Under prefers-reduced-motion the swap is an
//     instant set and rows are simply all bright (handled in the helpers).
//
// Mobile (<lg): pin + scrub are DROPPED entirely (established pattern). Each
// project renders as a plain block (thumbnail card + meta) that fades/slides in
// once via the foundation's `scrollReveal`. No pinned column, no 3D.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import {
  marqueeRowFocus,
  prefersReducedMotion,
  scrollReveal,
  thumbRailSwap,
} from "@/lib/animations";
import { BG_SHAPE_OPACITY, DURATION, EASE } from "@/lib/motion";
import type { Project } from "@/lib/projects";
import { ThumbnailCard } from "@/components/ThumbnailCard";
import { ScrambleText } from "@/components/ScrambleText";
import { externalHref } from "@/lib/url";

const HeroHead = dynamic(
  () => import("@/components/HeroHead").then((m) => m.HeroHead),
  { ssr: false },
);

// GitHub mark (simple-icons). Demoted from the card's primary action to a small
// corner button — the card body now navigates to the case-study page instead.
const GITHUB_ICON =
  "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12";

/** Small GitHub link pinned to the card's bottom-right corner — the empty space
 *  beside the stack tags, below the thumbnail. A separate click target that
 *  still opens the repo externally (kept out of the card-body <Link>). Anchored
 *  to the bottom of the wrapper (thumbnail + meta), so it sits level with the
 *  last meta line where the corner is otherwise blank. */
function GitHubCorner({ repo, name }: { repo: string; name: string }) {
  return (
    <a
      href={externalHref(repo)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${name} on GitHub`}
      className="absolute bottom-0 right-0 z-20 flex h-14 w-14 items-center justify-center rounded-xl bg-black/50 text-zinc-300 ring-1 ring-white/30 backdrop-blur transition-colors hover:text-white hover:ring-white/60"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
        <path d={GITHUB_ICON} />
      </svg>
    </a>
  );
}

/** Shared meta block (index, title, description, stack) used by both layouts. */
function ProjectMeta({ project: p }: { project: Project }) {
  return (
    <div className="flex flex-col gap-2 text-left">
      <p className="text-sm font-medium text-white">
        <span className="mr-2 font-mono text-zinc-500">{p.num}</span>
        {/* Project card title — scrambles on scroll-into-view + hover. */}
        <ScrambleText entrance="observer">{p.name}</ScrambleText>
      </p>
      <p className="text-sm text-zinc-400">{p.description}</p>
      <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
        {p.stack.join(" · ")}
      </p>
    </div>
  );
}

export function Projects({ projects }: { projects: Project[] }) {
  const root = useRef<HTMLElement>(null);
  const pinCol = useRef<HTMLDivElement>(null);
  const bgShape = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Which row sits in the viewport-center active zone (desktop only).
  const [active, setActive] = useState(0);
  const prevActive = useRef(0);

  // Gate the ambient background canvas until the layout has settled (below).
  const [bgReady, setBgReady] = useState(false);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // ---- Desktop: pin the visual column + scrubbed row focus ----
      mm.add("(min-width: 1024px)", () => {
        const rows = gsap.utils.toArray<HTMLElement>(
          "[data-marquee-row]",
          root.current,
        );

        // Background polyhedron: one-shot zoom-in (smaller/further away → resting
        // size at ambient opacity) as the section enters. CSS sticky handles its
        // centering afterwards, so no pin is involved.
        if (prefersReducedMotion()) {
          gsap.set(bgShape.current, { scale: 1, opacity: BG_SHAPE_OPACITY });
        } else {
          gsap.fromTo(
            bgShape.current,
            { scale: 0.6, opacity: 0 },
            {
              scale: 1,
              opacity: BG_SHAPE_OPACITY,
              duration: DURATION.bgZoom,
              ease: EASE.marquee, // power2.out
              scrollTrigger: {
                trigger: root.current,
                start: "top 70%",
                toggleActions: "play none none none",
              },
            },
          );
        }

        // Pin the visual column while the row list scrolls past it.
        ScrollTrigger.create({
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          pin: pinCol.current,
          pinSpacing: false, // column lives in a grid; the list defines height
        });

        rows.forEach((row, i) => {
          // Scrubbed dim → bright → dim focus tween (reduced-motion aware).
          marqueeRowFocus(row);

          // Callback-only trigger: which row occupies the center band drives
          // the thumbnail rail. Deliberately separate from the color scrub so
          // the swap fires once per row change (the scrub is continuous).
          ScrollTrigger.create({
            trigger: row,
            start: "top 55%",
            end: "bottom 45%",
            onToggle: (self) => self.isActive && setActive(i),
          });
        });
      });

      // ---- Mobile: no pin, no scrub — simple one-shot reveals ----
      mm.add("(max-width: 1023px)", () => {
        gsap.utils
          .toArray<HTMLElement>("[data-project-block]", root.current)
          .forEach((block) => {
            scrollReveal(block, { y: 28 }, "top 85%");
          });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  // Thumbnail rail swap on active-row change (desktop). Reduced motion: instant.
  useEffect(() => {
    if (prevActive.current === active) return;
    const out = cardRefs.current[prevActive.current];
    const inc = cardRefs.current[active];
    prevActive.current = active;
    if (!out || !inc) return;

    gsap.killTweensOf([out, inc]); // fast scrolling: cancel an in-flight swap
    gsap.set(out, { pointerEvents: "none" });
    gsap.set(inc, { pointerEvents: "auto" });

    if (prefersReducedMotion()) {
      gsap.set(out, { opacity: 0 });
      gsap.set(inc, { opacity: 1, y: 0 });
      return;
    }
    thumbRailSwap(out, inc);
  }, [active]);

  // The ambient background canvas mounts only AFTER the pinned/sticky + Lenis
  // layout has settled, so R3F measures the correct size on its first pass (it
  // otherwise renders small in the top-left until the first scroll re-measures
  // it). A late resize nudge covers any residual shift. The short delay is
  // invisible — the pixel-reveal cover is still dissolving over the page then.
  useEffect(() => {
    const mount = setTimeout(() => setBgReady(true), 150);
    const nudge = setTimeout(() => window.dispatchEvent(new Event("resize")), 600);
    return () => {
      clearTimeout(mount);
      clearTimeout(nudge);
    };
  }, []);

  return (
    <section id="projects" ref={root} className="relative bg-black px-6 sm:px-10">
      {/* ====== Desktop: ambient background polyhedron (behind everything) == */}
      {/* Full-section absolute layer at z-0, pointer-events-none. The sticky
          inner div keeps the shape viewport-centered for the whole section
          scroll; GSAP zooms it in once on section enter and dims it to its
          ambient resting opacity. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 hidden lg:block"
      >
        <div className="sticky top-0 flex h-screen items-center justify-center">
          <div
            ref={bgShape}
            className="relative aspect-square w-[clamp(24rem,42vw,34rem)] opacity-0"
          >
            {/* Slow idle auto-spin on the ambient centerpiece; mouse tilt still
                tracks on top of it. Mounted after layout settles (bgReady) so the
                canvas measures/centres correctly on first paint. */}
            {bgReady && <HeroHead spin={0.12} scan />}
          </div>
        </div>
      </div>

      {/* ================= Desktop: marquee + pinned visual column ========== */}
      <div className="relative z-10 hidden lg:grid lg:grid-cols-[1.2fr_1fr]">
        {/* Left: tall stack of marquee rows. Row height (40vh each) sets the
            section height and therefore the pin distance. pt-[30vh] head room
            centers the FIRST row in the viewport at scroll-top, so LeadUnity is
            the active/open card on load (without it, row 0 sits high and OnePick
            lands in the center band instead). pb-[45vh] is matching tail room so
            the LAST row can also reach the center active zone. */}
        <div className="pb-[45vh] pt-[30vh]">
          {projects.map((p) => (
            <div
              key={p.num}
              data-marquee-row
              // CSS mirrors MARQUEE_DIM so rows render dimmed pre-hydration;
              // GSAP's inline styles take over from there.
              className="flex min-h-[40vh] items-baseline gap-6 text-zinc-500 opacity-35"
            >
              <span className="font-mono text-sm">{p.num}</span>
              <ScrambleText
                as="h3"
                entrance="observer"
                className="text-5xl font-semibold tracking-tight xl:text-7xl"
              >
                {p.name}
              </ScrambleText>
            </div>
          ))}
        </div>

        {/* Right: pinned visual column — the card stack (the polyhedron now
            lives in the section background layer above). The outer div is the
            grid cell; the inner div is what pins. */}
        <div className="relative">
          <div
            ref={pinCol}
            className="flex h-screen flex-col items-center justify-center gap-10"
          >
            {/* Card stack: one absolutely-positioned card per project; only the
                active one is visible. thumbRailSwap crossfades between them.
                justify-center keeps every card's content vertically centered in
                the box (which is itself centered in the column), so cards with
                different content heights don't sit off-center. */}
            <div className="relative h-96 w-full max-w-sm">
              {projects.map((p, i) => (
                <div
                  key={p.num}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  className="absolute inset-0 flex flex-col justify-center"
                  style={{
                    opacity: i === 0 ? 1 : 0,
                    pointerEvents: i === 0 ? "auto" : "none",
                  }}
                >
                  {/* Card body → case-study page; GitHub is a separate corner target. */}
                  <div className="relative">
                    <Link
                      href={`/projects/${p.slug}`}
                      className="flex flex-col gap-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    >
                      <ThumbnailCard project={p} />
                      <ProjectMeta project={p} />
                    </Link>
                    <GitHubCorner repo={p.repo} name={p.name} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================= Mobile: plain revealed blocks ==================== */}
      {/* pt clears the fixed navbar, whose height grows by the notch safe-area
          inset on standalone/notched phones — a flat py-24 let the first card
          slide under the logo/menu. */}
      <div className="flex flex-col gap-16 pb-24 pt-[calc(6rem+env(safe-area-inset-top))] lg:hidden">
        {projects.map((p) => (
          <div key={p.num} data-project-block className="relative">
            <Link href={`/projects/${p.slug}`} className="flex flex-col gap-4">
              <ThumbnailCard project={p} />
              <ProjectMeta project={p} />
            </Link>
            <GitHubCorner repo={p.repo} name={p.name} />
          </div>
        ))}
      </div>
    </section>
  );
}
