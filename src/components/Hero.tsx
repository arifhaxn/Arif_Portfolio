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

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { gsap, useGSAP } from "@/lib/gsap";
import { navIntro } from "@/lib/animations";
import { INTRO } from "@/lib/motion";
import { isRevealed, onReveal } from "@/lib/introControl";
import { LiveStatus } from "@/components/Hud";
import { LiquidButton } from "@/components/LiquidButton";
import { ScrambleText } from "@/components/ScrambleText";
import { useHeadScan } from "@/components/providers/HeadScanProvider";

const CONTACT_HREF = "/about#contact";

const HeroHead = dynamic(
  () => import("@/components/HeroHead").then((m) => m.HeroHead),
  { ssr: false },
);

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const router = useRouter();
  const headScan = useHeadScan();

  // Play the robot exit-scan before navigating (same transition the Navbar uses).
  const goContact = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (!headScan.hasMounted()) return; // no robot yet → default <Link> navigation
    e.preventDefault();
    // `scroll: false` — the About page positions itself on #contact once its pin-
    // spacer exists; letting Next scroll on nav lands on the wrong (pre-pin) spot
    // (the skills section) for a beat first.
    void headScan.playExitAll().then(() =>
      router.push(CONTACT_HREF, { scroll: false }),
    );
  };

  // Keep the nameplate hidden until the intro reveals the page, so the fade/rise
  // + scramble entrance plays IN VIEW rather than behind the preloader cover.
  useGSAP(
    () => {
      gsap.set("[data-hero-line]", { opacity: 0 });
    },
    { scope: root },
  );
  // Nameplate + HUD scramble/fade in the moment the page reveals.
  useEffect(() => onReveal(() => navIntro("[data-hero-line]", 12)), []);

  // Mount the robot during the intro's STATIC hold (just after the logo wipe) so
  // its heavy ~180ms WebGL build lands while nothing's animating — no wipe
  // stutter — yet it's built and ready to SCAN the instant the page reveals, in
  // sync with the text (the scan itself is gated on reveal via `scanOnReveal`).
  // No intro (SPA return / reduced) → mount right away (lazy initial state).
  const [showRobot, setShowRobot] = useState<boolean>(isRevealed);
  useEffect(() => {
    if (showRobot) return;
    const t = window.setTimeout(() => setShowRobot(true), INTRO.reveal * 1000);
    return () => window.clearTimeout(t);
  }, [showRobot]);

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
              normalized by its bounding sphere, so it only fills ~68% at zoom 1).
              Mounted only after the intro reveals — see showRobot above. */}
          {showRobot && (
            <HeroHead shape="robot" zoom={0.95} scanOnReveal draggable />
          )}
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
          className="mt-3 font-[family-name:var(--font-relidux)] text-5xl uppercase leading-[0.95] tracking-[0.03em] text-white sm:text-7xl"
        >
          <ScrambleText as="span" className="block">
            Arif
          </ScrambleText>
          <ScrambleText as="span" className="block">
            Hasan
          </ScrambleText>
        </h1>
      </div>

      {/* --- Contact CTA — bottom-RIGHT (liquid-fill button) -------------- */}
      {/* The wrapper carries the position + intro fade (`data-hero-line`); the
          LiquidButton is the visual, and routes to /about#contact via goContact. */}
      <div
        data-hero-line
        className="absolute bottom-12 right-6 z-10 sm:right-10"
      >
        <LiquidButton href={CONTACT_HREF} onClick={goContact} aria-label="Get in touch">
          Get in touch
        </LiquidButton>
      </div>
    </section>
  );
}
