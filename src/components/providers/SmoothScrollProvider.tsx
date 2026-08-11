"use client";

// -----------------------------------------------------------------------------
// SmoothScrollProvider
// -----------------------------------------------------------------------------
// Wraps the app in Lenis smooth scrolling and — crucially — drives Lenis from
// GSAP's own ticker so there is ONE requestAnimationFrame loop shared by Lenis
// and every ScrollTrigger. This keeps scroll-linked animations perfectly in sync
// with the smoothed scroll position (no jitter, no double RAF).
//
// It also:
//   • pushes each Lenis scroll frame into ScrollTrigger.update() so triggers fire
//     against the smoothed position, not the native one;
//   • refreshes ScrollTrigger once mounted so pins/starts measure correct layout;
//   • disables Lenis for users who prefer reduced motion (native scroll instead);
//   • exposes the Lenis instance via context + a `useSmoothScroll` hook so any
//     component can programmatically `scrollTo`, stop, or start it.
// -----------------------------------------------------------------------------

import { createContext, useContext, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

const SmoothScrollContext = createContext<Lenis | null>(null);

// Handle on the live instance stored on `window` (not a module-level variable):
// under the dev bundler this module can be duplicated, so a module-scoped var set
// by the provider isn't guaranteed to be the same one a click handler imports.
// `window` is unambiguously shared. Lets non-render code read the CURRENT Lenis.
type LenisWindow = Window & { __lenis?: Lenis | null };

/** Access the live Lenis instance (e.g. `lenis?.scrollTo("#section")`). */
export function useSmoothScroll(): Lenis | null {
  return useContext(SmoothScrollContext);
}

/** Read the live Lenis instance imperatively (outside render), or null. */
export function getLenis(): Lenis | null {
  if (typeof window === "undefined") return null;
  return (window as LenisWindow).__lenis ?? null;
}

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  // Held in state (not a ref) so context consumers re-render once Lenis is live
  // and can call `scrollTo` etc. against a real instance instead of null.
  const [lenis, setLenis] = useState<Lenis | null>(null);

  // useGSAP runs the setup after mount and auto-reverts on unmount, so all the
  // ticker/ScrollTrigger wiring is torn down cleanly (important with Fast Refresh
  // and route changes).
  useGSAP(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Respect reduced-motion: skip Lenis entirely and let the browser scroll
    // natively. ScrollTrigger still works against the native scroll position.
    if (reduceMotion) return;

    const instance = new Lenis({
      duration: 1.2, // ~1.2s glide to target
      lerp: 0.1, // smoothing factor per frame
      smoothWheel: true, // smooth mouse-wheel/trackpad
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      autoRaf: false, // WE drive the loop via gsap.ticker, not Lenis
    });
    setLenis(instance);
    (window as LenisWindow).__lenis = instance;

    // Every Lenis frame → let ScrollTrigger recompute its progress.
    instance.on("scroll", ScrollTrigger.update);

    // Single shared RAF loop: gsap.ticker time is in seconds, Lenis wants ms.
    const raf = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0); // don't fast-forward after tab was backgrounded

    // Layout is settled now — make sure pins/starts measured correctly.
    ScrollTrigger.refresh();

    // Cleanup: detach from the ticker and destroy the instance.
    return () => {
      gsap.ticker.remove(raf);
      instance.destroy();
      setLenis(null);
      if ((window as LenisWindow).__lenis === instance)
        (window as LenisWindow).__lenis = null;
    };
  }, []);

  return (
    <SmoothScrollContext.Provider value={lenis}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
