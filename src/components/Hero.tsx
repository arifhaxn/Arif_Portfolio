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

import { useRef } from "react";
import dynamic from "next/dynamic";
import { useGSAP } from "@/lib/gsap";
import { navIntro } from "@/lib/animations";
import { LiveStatus } from "@/components/Hud";
import { ScrambleText } from "@/components/ScrambleText";
import { SOCIALS } from "@/lib/about";

const HeroHead = dynamic(
  () => import("@/components/HeroHead").then((m) => m.HeroHead),
  { ssr: false },
);

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      navIntro("[data-hero-line]", 12, { delay: 0.2 });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      {/* --- Giant robot centerpiece — fills the viewport (behind the HUD) --- */}
      {/* Explicitly-sized square (vmin) so R3F measures the canvas reliably;
          centered and clipped by the section. `zoom` enlarges the model. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
      >
        <div className="relative aspect-square w-[105vmin]">
          <HeroHead shape="robot" zoom={1.4} />
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

      {/* --- Socials — bottom-RIGHT --------------------------------------- */}
      <div
        data-hero-line
        className="absolute bottom-12 right-6 z-10 flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500 sm:right-10"
      >
        {SOCIALS.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-white"
          >
            {s.label}
          </a>
        ))}
      </div>
    </section>
  );
}
