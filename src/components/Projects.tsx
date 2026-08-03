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
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import {
  marqueeRowFocus,
  prefersReducedMotion,
  scrollReveal,
  thumbRailSwap,
} from "@/lib/animations";
import { BG_SHAPE_OPACITY, DURATION, EASE } from "@/lib/motion";
import { PROJECTS } from "@/lib/projects";
import { ThumbnailCard } from "@/components/ThumbnailCard";
import { ScrambleText } from "@/components/ScrambleText";

const HeroHead = dynamic(
  () => import("@/components/HeroHead").then((m) => m.HeroHead),
  { ssr: false },
);

/** Shared meta block (description, stack, repo link) used by both layouts. */
function ProjectMeta({ index }: { index: number }) {
  const p = PROJECTS[index];
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
      <a
        href={p.repo}
        target="_blank"
        rel="noopener noreferrer"
        className="w-fit text-xs font-medium uppercase tracking-[0.15em] text-zinc-300 underline underline-offset-4 transition-colors hover:text-white"
      >
        GitHub ↗
      </a>
    </div>
  );
}

export function Projects() {
  const root = useRef<HTMLElement>(null);
  const pinCol = useRef<HTMLDivElement>(null);
  const bgShape = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Which row sits in the viewport-center active zone (desktop only).
  const [active, setActive] = useState(0);
  const prevActive = useRef(0);

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
                tracks on top of it. */}
            <HeroHead spin={0.12} />
          </div>
        </div>
      </div>

      {/* ================= Desktop: marquee + pinned visual column ========== */}
      <div className="relative z-10 hidden lg:grid lg:grid-cols-[1.2fr_1fr]">
        {/* Left: tall stack of marquee rows. Row height (40vh each) sets the
            section height and therefore the pin distance. The bottom padding is
            tail scroll room: without it the section ends while the LAST row is
            still in the lower viewport, so it can never reach the center active
            zone — its card (06) would never swap in nor fully brighten. */}
        <div className="pb-[45vh]">
          {PROJECTS.map((p) => (
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
                active one is visible. thumbRailSwap crossfades between them. */}
            <div className="relative h-80 w-full max-w-sm">
              {PROJECTS.map((p, i) => (
                <div
                  key={p.num}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  className="absolute inset-0 flex flex-col gap-4"
                  style={{
                    opacity: i === 0 ? 1 : 0,
                    pointerEvents: i === 0 ? "auto" : "none",
                  }}
                >
                  <ThumbnailCard project={p} />
                  <ProjectMeta index={i} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================= Mobile: plain revealed blocks ==================== */}
      <div className="flex flex-col gap-16 py-24 lg:hidden">
        {PROJECTS.map((p, i) => (
          <div key={p.num} data-project-block className="flex flex-col gap-4">
            <ThumbnailCard project={p} />
            <ProjectMeta index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}
