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

import { useCallback, useEffect, useRef, useState } from "react";
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
import type { HeroContent } from "@/lib/content-types";

const CONTACT_HREF = "/about#contact";
const ABOUT_HREF = "/about";

const HeroHead = dynamic(
  () => import("@/components/HeroHead").then((m) => m.HeroHead),
  { ssr: false },
);

export function Hero({ hero }: { hero: HeroContent }) {
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

  // Tapping the robot goes to /about — same exit-scan hand-off as the CTA above
  // (the robot IS the thing that scans out, so it dissolves under your finger and
  // the next page arrives once it's gone). HeroHead only calls this for a press
  // and release that barely moved, so swinging the figure around never navigates;
  // `navigating` additionally swallows a second tap during the ~1.2s scan-out.
  const navigating = useRef(false);
  const goAbout = useCallback(() => {
    if (navigating.current) return;
    navigating.current = true;
    void headScan.playExitAll().then(() => router.push(ABOUT_HREF));
  }, [headScan, router]);

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
            <HeroHead shape="robot" zoom={0.95} scanOnReveal draggable onActivate={goAbout} />
          )}
        </div>
      </div>

      {/* --- Clock / status — middle-LEFT on desktop; pinned just under the nav
          on mobile (portrait has no room mid-height without colliding with the
          right-hand status + the robot). max-w + LiveStatus's flex-wrap let the
          long clock line wrap within the screen instead of overflowing. -------- */}
      <div
        data-hero-line
        className="absolute left-6 top-[calc(env(safe-area-inset-top)+6.5rem)] z-10 max-w-[calc(100%-3rem)] sm:left-10 sm:top-1/2 sm:max-w-none sm:-translate-y-1/2"
      >
        <LiveStatus
          statusWords={hero.hud.statusWords}
          timeZone={hero.hud.timeZone}
          locationLabel={hero.hud.locationLabel}
        />
      </div>

      {/* --- Status line — middle-RIGHT on desktop. Hidden on mobile: it's ambient
          decoration and there's no room for it beside the clock without overlap. */}
      <div
        data-hero-line
        className="absolute right-6 top-1/2 z-10 hidden -translate-y-1/2 text-right font-mono text-[0.625rem] uppercase leading-relaxed tracking-[0.2em] text-zinc-500 sm:right-10 sm:block"
      >
        <span className="block text-zinc-300">{hero.tagline.primary}</span>
        <span className="block">{hero.tagline.secondary}</span>
      </div>

      {/* --- Name — bottom-LEFT. Raised on mobile so the CTA can stack directly
          beneath it instead of colliding with it in the bottom-right corner. --- */}
      <div className="absolute bottom-32 left-6 z-10 text-left sm:bottom-12 sm:left-10">
        <ScrambleText
          as="p"
          data-hero-line
          className="font-mono text-xs uppercase tracking-[0.3em] text-blue-400"
        >
          {hero.eyebrow}
        </ScrambleText>
        <h1
          data-hero-line
          className="mt-3 font-[family-name:var(--font-relidux)] text-5xl uppercase leading-[0.95] tracking-[0.03em] text-white sm:text-7xl"
        >
          {hero.name.split(/\s+/).map((word, i) => (
            <ScrambleText as="span" key={i} className="block">
              {word}
            </ScrambleText>
          ))}
        </h1>
      </div>

      {/* --- Contact CTA — bottom-RIGHT on desktop; stacked under the name at the
          bottom-LEFT on mobile so the two no longer overlap. ------------------- */}
      {/* The wrapper carries the position + intro fade (`data-hero-line`); the
          LiquidButton is the visual, and routes to /about#contact via goContact. */}
      <div
        data-hero-line
        className="absolute bottom-12 left-6 z-10 sm:left-auto sm:right-10"
      >
        <LiquidButton href={CONTACT_HREF} onClick={goContact} aria-label={hero.ctaLabel}>
          {hero.ctaLabel}
        </LiquidButton>
      </div>
    </section>
  );
}
