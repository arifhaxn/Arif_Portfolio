"use client";

// -----------------------------------------------------------------------------
// IntroPreloader — landing entrance cover
// -----------------------------------------------------------------------------
// On the FIRST load of `/`: a full-screen black cover shows the logo centered and
// large. After ~1s it shrinks and docks into the navbar's logo slot (GSAP
// Flip.fit), the black clears to reveal the page, and the hero entrance fires (so
// the scramble/intro plays in view). The navbar logo sits behind the black during
// the dock, so there's no double-image — the intro logo hands off onto it.
//
// Mounted only on `/` (from page.tsx), so the cover is in the first server paint
// (no hero flash). The effect claims the one-shot: on the first client load it
// plays; otherwise it just uncovers (claimIntro already revealed the page).
// Reduced motion: a short hold then a plain fade, no shrink-travel.
// -----------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, Flip } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/animations";
import { claimIntro, reveal } from "@/lib/introControl";
import { INTRO } from "@/lib/motion";

export function IntroPreloader() {
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return; // run once (also guards StrictMode double-invoke)
    ranRef.current = true;

    const overlay = overlayRef.current;
    const logo = logoRef.current;
    const play = claimIntro(pathname);
    if (!overlay || !logo || !play) {
      if (overlay) overlay.style.display = "none"; // not the first load → uncover
      return; // claimIntro already revealed when !play
    }

    const navLogo = document.querySelector<HTMLElement>("[data-nav-logo]");
    const reduce = prefersReducedMotion();

    // Reduced motion (or no navbar logo to dock into): show the logo, brief hold,
    // then fade — no wipe or shrink-travel.
    if (reduce || !navLogo) {
      gsap.set(logo, { clipPath: "inset(0 0 0% 0)" });
      const tl = gsap.timeline({
        onComplete: () => {
          overlay.style.display = "none";
        },
      });
      tl.to({}, { duration: reduce ? 0.15 : INTRO.hold });
      tl.add(reveal);
      tl.to(overlay, { autoAlpha: 0, duration: INTRO.fade, ease: "power2.out" });
      return () => {
        tl.kill();
      };
    }

    // Full intro: wipe the big logo in top→bottom, hold, then shrink + dock into
    // the navbar while the black clears.
    gsap.fromTo(
      logo,
      { clipPath: "inset(0 0 100% 0)" },
      { clipPath: "inset(0 0 0% 0)", duration: INTRO.reveal, ease: "power2.out" },
    );
    const run = gsap.delayedCall(INTRO.reveal + INTRO.hold, () => {
      // Shrink + travel the logo onto the (settled) navbar logo.
      Flip.fit(logo, navLogo, { duration: INTRO.dock, ease: INTRO.ease, scale: true });
      // Reveal the page as it docks: fade only the black background (the logo
      // stays visible), and fire the hero entrance as it starts clearing.
      gsap.to(overlay, {
        backgroundColor: "rgba(0,0,0,0)",
        duration: INTRO.fade,
        ease: "power2.inOut",
        delay: INTRO.dock * 0.45,
        onStart: reveal,
      });
      // Hand off: the docked logo fades out onto the now-visible navbar logo,
      // then the cover is removed.
      gsap.to(logo, {
        autoAlpha: 0,
        duration: 0.25,
        delay: INTRO.dock - 0.05,
        onComplete: () => {
          overlay.style.display = "none";
        },
      });
    });
    return () => {
      run.kill();
    };
  }, [pathname]);

  return (
    <div
      ref={overlayRef}
      aria-hidden
      className="fixed inset-0 z-[120] grid place-items-center bg-black"
    >
      {/* Plain <img> (not next/image) so the ref + GSAP Flip.fit stay simple; it's
          the same tiny asset the navbar uses. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={logoRef}
        src="/arif-logo.svg"
        alt=""
        className="h-[min(64vmin,36rem)] w-[min(64vmin,36rem)] object-contain"
        // Vector logo → razor-sharp at any size. Clipped from the first paint so
        // the wipe-in reveals it top→bottom; will-change keeps that smooth.
        style={{ clipPath: "inset(0 0 100% 0)", willChange: "clip-path, transform" }}
      />
    </div>
  );
}
