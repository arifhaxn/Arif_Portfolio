"use client";

// -----------------------------------------------------------------------------
// Hero
// -----------------------------------------------------------------------------
// Two motions live here:
//
//   1. Nameplate intro — the heading lines fade in (opacity 0→1) and rise
//      (y: 20 → 0), same timing family as the nav (0.7s / power3.out / ~0.075s
//      stagger) but kicked off with a small `delay` so the NAV leads and the
//      HERO follows. Reuses the foundation's `navIntro` helper. (Unchanged.)
//
//   2. The 3D head — the mouse-tilt and pose cross-fade now live inside the R3F
//      <HeroHead> component (they were retargeted from DOM boxes onto the 3D
//      object), so this file no longer wires them. HeroHead is loaded client-only
//      via next/dynamic because a WebGL <Canvas> can't render on the server.
// -----------------------------------------------------------------------------

import { useRef } from "react";
import dynamic from "next/dynamic";
import { useGSAP } from "@/lib/gsap";
import { navIntro } from "@/lib/animations";
import { CodingSince, LiveStatus } from "@/components/Hud";

// ssr:false — the WebGL canvas is client-only. The sized wrapper below reserves
// the space so there's no layout shift while it loads.
const HeroHead = dynamic(
  () => import("@/components/HeroHead").then((m) => m.HeroHead),
  { ssr: false },
);

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      // Heading: y: 20 → 0. `delay` makes the hero enter just after the nav,
      // so the eye reads nav → hero rather than everything at once.
      navIntro("[data-hero-line]", 20, { delay: 0.25 });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      // Top-aligned so spacing is deterministic: pt-28 clears the fixed navbar
      // with breathing room above the head, and the tight gap-6 pulls the
      // nameplate up close beneath it (balanced, not crammed-top/far-bottom).
      // relative: anchors the absolute HUD corner elements below.
      className="relative flex min-h-screen flex-col items-center gap-6 px-6 pt-28 text-center"
    >
      {/* --- 3D low-poly wireframe head (hero visual, anchors the top) ------- */}
      {/* Responsive via clamp(): floor 14rem, ~42vw fluid, cap 21rem. The head
          silhouette fills ~⅔ of the square canvas (the rest is transparent over
          black, so invisible), which lands the visible head at ≈ the nameplate
          width across breakpoints. 42vw always leaves side margin, so it never
          overflows or pushes the text. aspect-square keeps it square; the box
          reserves space so there's no load-time shift. */}
      <div
        aria-hidden
        className="relative aspect-square w-[clamp(14rem,42vw,21rem)]"
      >
        <HeroHead />
      </div>

      {/* --- Nameplate / heading (below the visual) -------------------------- */}
      <div className="flex flex-col items-center gap-2">
        <p
          data-hero-line
          className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500"
        >
          / Full-Stack Developer
        </p>
        <h1
          data-hero-line
          className="text-5xl font-semibold tracking-tight text-white sm:text-7xl"
        >
          <span className="block">Arif</span>
          <span className="block">Hasan</span>
        </h1>
        <p
          data-hero-line
          className="max-w-md text-sm text-zinc-400 sm:text-base"
        >
          Designer &amp; developer building motion-led interfaces.
        </p>
      </div>

      {/* --- HUD corners (shared with About) --------------------------------- */}
      {/* data-hero-line: they join the existing nameplate intro stagger. */}
      <div data-hero-line className="absolute bottom-8 left-6 sm:left-10">
        <LiveStatus />
      </div>
      <div data-hero-line className="absolute bottom-8 right-6 sm:right-10">
        <CodingSince />
      </div>
    </section>
  );
}
