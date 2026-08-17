"use client";

// -----------------------------------------------------------------------------
// AboutView — /about page body (client)
// -----------------------------------------------------------------------------
// The interactive About experience: portrait hero + curtain reveal → career
// timeline → skills → contact. All COPY/DATA is passed in from the server page
// (sourced from Firestore: content/about, content/hero, content/career,
// content/footer); everything else — the pin/curtain choreography, marquee,
// scroll math, layout, motion tokens — is unchanged from before.
//
// Structure, per the references:
//   1. Hero — halftone-dot portrait centered, name in the bottom-left, a
//      "scroll" cue, coding-since bottom-right.
//   2. Description — headline + bio on the LEFT, the android (robot) on the RIGHT.
//   3. Career — branching scroll-drawn timeline (see <Career>).
//   4. Skills — big-title blocks (index — / Category / items), one per group.
//   5. Contact — giant email, a scrolling tag ribbon, copy-email + socials.
// -----------------------------------------------------------------------------

import { Fragment, useEffect, useLayoutEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import {
  aboutCurtainRise,
  floatLoop,
  marqueeLoop,
  scrollReveal,
} from "@/lib/animations";
import { ScrambleText } from "@/components/ScrambleText";
import { Career } from "@/components/Career";
import { SkillsConstellation } from "@/components/SkillsConstellation";
import { Tesseract } from "@/components/Tesseract";
import { HalftonePortrait } from "@/components/HalftonePortrait";
import { HeroStatus } from "@/components/HeroStatus";
import { CodingSince } from "@/components/Hud";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { ABOUT_PANEL } from "@/lib/motion";
import { externalHref } from "@/lib/url";
import type {
  AboutContent,
  CareerContent,
  FooterContent,
  HeroContent,
} from "@/lib/content-types";

const HeroHead = dynamic(
  () => import("@/components/HeroHead").then((m) => m.HeroHead),
  { ssr: false },
);

// Layout effect on the client (runs before paint), plain effect on the server.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function AboutView({
  about,
  hero,
  career,
  footer,
  logo,
}: {
  about: AboutContent;
  hero: HeroContent;
  career: CareerContent;
  footer: FooterContent;
  logo: string;
}) {
  const root = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  // Read Lenis through a ref so the pin setup can run ONCE (stable deps) yet the
  // remeasure below still sees the live instance once it mounts. Depending on
  // `lenis` directly would re-run useGSAP on the null→instance swap and stack a
  // second pin-spacer (doubling the pinned scroll distance).
  const lenis = useSmoothScroll();
  const lenisRef = useRef(lenis);
  // Keep the latest Lenis instance readable from the (stable-deps) pin setup and
  // its delayed remeasures — see the note on lenisRef above. This mirrors the
  // original /about page's pattern exactly (kept for byte-identical behavior).
  // eslint-disable-next-line react-hooks/refs
  lenisRef.current = lenis;

  // Giant email split so the "@" can carry the blue accent, exactly as before.
  const [emailLocal, emailDomain] = footer.email.split("@");

  useGSAP(
    () => {
      // (The hero portrait runs its own dot-assembly entrance in HalftonePortrait.)
      // [data-desc] isn't reveal-faded here — on desktop the curtain drags it into
      // view; on mobile it just stacks after the portrait screen.
      scrollReveal("[data-skill]", { y: 24 }, "top 88%");
      scrollReveal("[data-contact]", { y: 24 }, "top 88%");
      floatLoop("[data-float]");
      const track = root.current?.querySelector("[data-marquee]");
      if (track) marqueeLoop(track);

      // Desktop: pin the portrait screen and raise the curtain (panel skyline +
      // description) over it, dragging the description up behind the panels (see
      // `aboutCurtainRise`). Reduced motion returns null and leaves the curtain in
      // normal flow, so the sections just stack.
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        const pinEl = heroRef.current;
        const dimmer = dimRef.current;
        const curtain = curtainRef.current;
        if (!pinEl || !dimmer || !curtain) return;
        const panels = gsap.utils.toArray<HTMLElement>("[data-panel]", curtain);
        const st = aboutCurtainRise({ pinEl, curtain, panels, dimmer });

        // The pin inserts a pin-spacer after Lenis measured the page, so the
        // Career/skills/contact triggers below can go stale — re-measure as
        // layout/fonts settle (mirrors the case-study hero pin).
        const remeasure = () => {
          ScrollTrigger.refresh();
          lenisRef.current?.resize();
        };
        const t1 = gsap.delayedCall(0.3, remeasure);
        const t2 = gsap.delayedCall(1.2, remeasure);
        window.addEventListener("load", remeasure);
        return () => {
          st?.kill();
          t1.kill();
          t2.kill();
          window.removeEventListener("load", remeasure);
        };
      });
    },
    { scope: root },
  );

  // Land directly on a #hash target (e.g. the landing "Get in touch" → #contact).
  // Runs AFTER the useGSAP above (declaration order) so the curtain pin-spacer
  // already exists, and BEFORE paint (layout effect) so there's no flash of the
  // wrong section. A guarded re-scroll corrects for late reflow (fonts), unless
  // the user has already started scrolling. `-96` clears the fixed navbar.
  useIsoLayoutEffect(() => {
    if (window.location.hash.length < 2) return;
    let userScrolled = false;
    const markScrolled = () => {
      userScrolled = true;
    };
    const go = (correcting: boolean) => {
      if (correcting && userScrolled) return; // don't fight the user
      const el = document.querySelector<HTMLElement>(window.location.hash);
      if (!el) return;
      // On a CLIENT-SIDE nav here (e.g. landing "Get in touch"/"Career"), Lenis
      // still holds the PREVIOUS route's scroll limit — and the landing page is
      // only one viewport tall, so its limit is ~0. Without re-measuring, the
      // scrollTo below clamps to that stale limit and lands back at the top (the
      // hero), never reaching #career/#contact. On desktop the curtain-pin path
      // happened to call resize(); mobile has no pin, so it never did — which is
      // why this only broke on phones. Re-measure on every viewport before scrolling.
      lenisRef.current?.resize();
      const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 96);
      if (lenisRef.current) lenisRef.current.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
    };
    go(false); // before paint → lands straight on the target
    const t = window.setTimeout(() => go(true), 500); // correct after any reflow
    window.addEventListener("wheel", markScrolled, { passive: true, once: true });
    window.addEventListener("touchmove", markScrolled, { passive: true, once: true });
    window.addEventListener("keydown", markScrolled, { once: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("wheel", markScrolled);
      window.removeEventListener("touchmove", markScrolled);
      window.removeEventListener("keydown", markScrolled);
    };
  }, []);

  return (
    <main ref={root} className="bg-black text-white">
      {/* =================== 1 · HERO + reveal curtain ==================== */}
      {/* Desktop: the portrait screen pins while a curtain (jagged panel skyline
          on top of the description) rises over it — dragging the description up
          directly behind the panels, no gap. Mobile / reduced motion: the curtain
          is normal flow (panels hidden), so it's just portrait screen → desc. */}
      <section ref={heroRef} className="relative min-h-screen overflow-hidden">
        {/* --- the fixed portrait screen --- */}
        <div className="relative h-screen overflow-hidden px-6 pt-28 sm:px-10">
        {/* Halftone-dot portrait (canvas), centered in the viewport behind the
            text — absolute inset-0 so the section's top padding doesn't push it
            low. Nudged slightly right so it reads centered against the big
            bottom-left nameplate. */}
        <div className="pointer-events-none absolute inset-0 z-0 flex translate-x-[1.5vw] items-center justify-center">
          <HalftonePortrait src={hero.portraitImage} />
        </div>

        {/* Name (bottom-left, over the portrait), like the reference. */}
        <div className="pointer-events-none absolute bottom-24 left-6 text-left sm:bottom-28 sm:left-10">
          <ScrambleText
            as="p"
            entrance="observer"
            className="font-mono text-xs uppercase tracking-[0.3em] text-blue-400"
          >
            {hero.eyebrow}
          </ScrambleText>
          <h1 className="mt-3 font-[family-name:var(--font-relidux)] text-5xl uppercase leading-[0.95] tracking-[0.03em] sm:text-7xl">
            {hero.name.split(/\s+/).map((word, i) => (
              <ScrambleText as="span" entrance="observer" key={i} className="block">
                {word}
              </ScrambleText>
            ))}
          </h1>
        </div>

        {/* Live status HUD — mid-right on desktop; moved to the top on mobile
            (below the notch-safe nav) so it clears the centered portrait. */}
        <div className="pointer-events-none absolute right-6 top-[calc(env(safe-area-inset-top)+6.5rem)] z-10 sm:right-10 sm:top-1/2 sm:-translate-y-1/2">
          <HeroStatus
            location={about.heroStatus.location}
            availability={about.heroStatus.availability}
            timeZone={about.heroStatus.timeZone}
          />
        </div>

        {/* Scroll cue — animated sliding segment (same motion as the projects
            section's case-study cue). Sits above the portrait (z-20). */}
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3 text-blue-400">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
            {about.heroStatus.scrollCue}
          </span>
          <span className="relative block h-12 w-px overflow-hidden">
            <span className="absolute inset-0 bg-current opacity-20" />
            <span className="scroll-cue-line absolute left-0 top-0 h-1/2 w-full bg-current" />
          </span>
        </div>
        <div className="absolute bottom-10 right-6 sm:right-10">
          <CodingSince year={hero.hud.codingSinceYear} />
        </div>
        </div>
        {/* --- end fixed portrait screen --- */}

        {/* Dimmer over the still-visible portrait (desktop only), scrubbed 0→peak. */}
        <div
          ref={dimRef}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-30 hidden h-screen bg-black lg:block"
          style={{ opacity: 0 }}
        />

        {/* Rising curtain — a jagged panel skyline sitting on top of the description.
            Desktop: absolute over the pinned portrait, parked a viewport+band below
            (lg:[transform…]) and driven up by JS so the description rides in directly
            behind the panels. Mobile / reduced motion: static in normal flow with the
            panel band hidden, so it's just the description after the portrait screen. */}
        <div
          ref={curtainRef}
          className="relative z-40 bg-black will-change-transform lg:absolute lg:inset-x-0 lg:top-0 lg:h-screen lg:[transform:translateY(142vh)]"
        >
          {/* Panel skyline — bottom-aligned on the curtain's top edge (its leading
              edge as it rises). Desktop only; jagged per-panel heights. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-full hidden items-end lg:flex"
            style={{ height: `${ABOUT_PANEL.bandVh * 100}vh` }}
          >
            {ABOUT_PANEL.widths.map((w, i) => {
              // Lit "building" face down to `litTo`, then PURE BLACK — invisible
              // against the black description below, so each panel's base blends.
              const lit = ABOUT_PANEL.litTo * 100;
              const fill = `linear-gradient(to bottom, #52525b 0%, #18181b ${lit * 0.5}%, #000 ${lit}%, #000 100%)`;
              return (
                <div
                  key={i}
                  data-panel
                  className="border-t-2 border-t-white/25 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-l-white/[0.06]"
                  style={{
                    width: `${w * 100}%`,
                    height: `${(ABOUT_PANEL.heights[i] ?? 1) * 100}%`,
                    backgroundImage: fill,
                  }}
                />
              );
            })}
          </div>

          {/* Description content (moved here so it rides up behind the panels). */}
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 sm:px-10 lg:h-full lg:grid-cols-2 lg:py-0">
            {/* LEFT — headline + bio */}
            <div data-desc className="flex flex-col gap-8">
              <h2 className="font-[family-name:var(--font-relidux)] text-4xl uppercase leading-[1.02] tracking-[0.03em] sm:text-6xl">
                {about.descriptionHeading.map((line, li) => (
                  <Fragment key={li}>
                    {li > 0 && <br />}
                    {line.segments.map((seg, si) =>
                      seg.accent ? (
                        <span key={si} className="text-blue-500">
                          {seg.text}
                        </span>
                      ) : (
                        <Fragment key={si}>{seg.text}</Fragment>
                      ),
                    )}
                  </Fragment>
                ))}
              </h2>
              <div className="max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
                <p>{about.bio}</p>
              </div>
            </div>

            {/* RIGHT — the android */}
            <div className="relative order-first lg:order-last">
              <div
                aria-hidden
                className="relative mx-auto aspect-square w-[clamp(16rem,40vw,30rem)]"
              >
                {/* floating prop */}
                <div
                  data-float
                  className="pointer-events-none absolute -left-6 top-10 h-3 w-3 rotate-45 border border-zinc-700"
                />
                {/* Slow continuous Y-axis spin (rad/s); composes on top of mouse
                    tilt + arm-breathe, and auto-disables under reduced motion. */}
                <HeroHead shape="robot" spin={0.3} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 2.5 · CAREER TIMELINE ====================== */}
      {/* Placed directly below the description (per request) — bio → career →
          skills → contact. Branching scroll-drawn timeline; see <Career>. */}
      <Career entries={career.items} eyebrow={career.eyebrow} />

      {/* ============================ 3 · SKILLS ========================== */}
      {/* Neural / circuit graph of the stack (capable devices); falls back to the
          original clean text grid on low-tier / reduced motion. See the component. */}
      <SkillsConstellation
        skills={about.skills}
        eyebrow={about.skillsEyebrow}
        logo={logo}
      />

      {/* =========================== 4 · CONTACT ========================== */}
      {/* Full-viewport: always fills the screen regardless of content length. */}
      <section
        id="contact"
        className="relative flex min-h-screen scroll-mt-24 flex-col justify-center overflow-hidden border-t border-white/5 px-6 py-24 sm:px-10"
      >
        {/* Ambient breathing-hypercube behind the contact copy (tier-gated). */}
        <div className="pointer-events-none absolute inset-0 z-0 opacity-70">
          <Tesseract />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          {/* labels */}
          <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.3em] text-blue-400">
            <span>{footer.eyebrow}</span>
            <span className="hidden sm:inline">{footer.note}</span>
          </div>

          {/* giant email — a real mailto link; opens the default mail client. */}
          <a
            href={`mailto:${footer.email}`}
            className="mt-14 block max-w-full cursor-pointer break-words [overflow-wrap:anywhere] text-[clamp(1.5rem,6.5vw,4.75rem)] font-semibold leading-tight tracking-tight text-white transition-colors sm:w-fit sm:leading-none hover:text-zinc-300"
          >
            {emailLocal}
            <span className="text-blue-500">@</span>
            {emailDomain}
          </a>

          {/* scrolling tag ribbon */}
          <div className="mt-14 overflow-hidden border-y border-white/5 py-3">
            <div
              data-marquee
              className="flex w-max whitespace-nowrap font-mono text-xs uppercase tracking-[0.2em] text-zinc-500"
            >
              {[...footer.tags, ...footer.tags].map((tag, i) => (
                <span key={i} className="flex items-center">
                  <span className="mx-6 text-blue-500">•</span>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Four brand tiles — span the FULL width in equal columns (2×2 on
              narrow viewports). Icon path + label come from content/footer (CMS).
              Resting: TRANSPARENT (the tesseract shows through) with a soft grey
              border; hover fills the card black (the gradient wash below), brightens
              the border, and lifts slightly (reduced-motion safe). */}
          <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {footer.socialLinks.map((s) => (
              <a
                key={s.label}
                href={externalHref(s.href)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-white/15 bg-transparent px-4 py-7 transition-[scale,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-blue-500 motion-safe:hover:scale-[1.06]"
              >
                {/* Gradient wash on its own rounded layer (no overflow clip, so the
                    zoom can't square the corners) — fades in smoothly on hover. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black opacity-0 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100"
                />
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  fill="currentColor"
                  className="relative h-7 w-7 text-zinc-300 transition-colors duration-500 group-hover:text-white"
                >
                  <path d={s.icon} />
                </svg>
                <span className="relative font-mono text-xs uppercase tracking-[0.2em] text-zinc-300 transition-colors duration-500 group-hover:text-white">
                  {s.label}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
