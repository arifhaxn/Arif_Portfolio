"use client";

// -----------------------------------------------------------------------------
// Hero — landing
// -----------------------------------------------------------------------------
// Reference-matched landing: the enlarged robot fills the viewport center, with
// HUD text on the sides — the live clock/status at mid-LEFT, a short status at
// mid-RIGHT, the name in the bottom-LEFT (like the /about hero), and socials in
// the bottom-RIGHT. Everything but the robot fades in via `navIntro`; the name
// and eyebrow also scramble (ScrambleText).
//
// The 3D robot's mouse-tilt + pose cross-fade live inside <HeroHead>; it's loaded
// client-only via next/dynamic (WebGL can't render on the server). `zoom` scales
// the model up so it fills the viewport like the reference figure.
// -----------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { gsap, useGSAP } from "@/lib/gsap";
import { navIntro } from "@/lib/animations";
import { onReveal } from "@/lib/introControl";
import { LiveStatus } from "@/components/Hud";
import { ScrambleText } from "@/components/ScrambleText";
import { SOCIALS } from "@/lib/about";

const HeroHead = dynamic(
  () => import("@/components/HeroHead").then((m) => m.HeroHead),
  { ssr: false },
);

export function Hero() {
  const root = useRef<HTMLElement>(null);

  // Keep the nameplate hidden until the intro reveals the page, so the fade/rise
  // + scramble entrance plays IN VIEW rather than behind the preloader cover.
  useGSAP(
    () => {
      gsap.set("[data-hero-line]", { opacity: 0 });
    },
    { scope: root },
  );
  useEffect(
    () => onReveal(() => navIntro("[data-hero-line]", 12)),
    [],
  );

  return (
    <section
      ref={root}
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      {/* --- Giant robot centerpiece — fills the viewport (behind the HUD) --- */}
      {/* On desktop the canvas is FULL-viewport so the background particle field
          spans the whole landing (not just a centered square); the camera frames
          the robot by height, so the wider canvas doesn't change the robot's size,
          it only adds room for particles left/right. On mobile it stays a centered
          square (100vmin) so the height-framed robot isn't oversized in portrait. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
      >
        <div className="relative aspect-square w-[100vmin] lg:aspect-auto lg:h-full lg:w-full">
          {/* zoom kept modest so the WHOLE robot stays in frame (the model is
              normalized by its bounding sphere, so it only fills ~68% at zoom 1). */}
          <HeroHead shape="robot" zoom={0.95} />
        </div>
      </div>

      {/* --- Clock / status — middle-LEFT, vertically centered ------------- */}
      <div
        data-hero-line
        className="absolute left-6 top-1/2 z-10 -translate-y-1/2 sm:left-10"
      >
        <LiveStatus />
      </div>

      {/* --- Status line — middle-RIGHT, vertically centered, right-aligned -- */}
      {/* ⚠ placeholder status copy — tweak to taste. */}
      <div
        data-hero-line
        className="absolute right-6 top-1/2 z-10 -translate-y-1/2 text-right font-mono text-[10px] uppercase leading-relaxed tracking-[0.2em] text-zinc-500 sm:right-10"
      >
        <span className="block text-zinc-300">Building quietly</span>
        <span className="block">from Sylhet, BD</span>
      </div>

      {/* --- Name — bottom-LEFT, like the /about hero --------------------- */}
      <div className="absolute bottom-12 left-6 z-10 text-left sm:left-10">
        <ScrambleText
          as="p"
          data-hero-line
          className="font-mono text-xs uppercase tracking-[0.3em] text-blue-400"
        >
          / Full-Stack Developer
        </ScrambleText>
        <h1
          data-hero-line
          className="mt-3 text-6xl font-semibold leading-[0.9] tracking-tight text-white sm:text-8xl"
        >
          <ScrambleText as="span" className="block">
            Arif
          </ScrambleText>
          <ScrambleText as="span" className="block">
            Hasan
          </ScrambleText>
        </h1>
      </div>

      {/* --- Socials — bottom-RIGHT (monochrome icons) -------------------- */}
      <div
        data-hero-line
        className="absolute bottom-12 right-6 z-10 flex items-center gap-5 text-zinc-400 sm:right-10"
      >
        {SOCIALS.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label}
            className="transition-colors hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path d={s.icon} />
            </svg>
          </a>
        ))}
      </div>
    </section>
  );
}
