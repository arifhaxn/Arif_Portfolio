"use client";

// -----------------------------------------------------------------------------
// /about — portrait hero + description + skills + contact
// -----------------------------------------------------------------------------
// Its own route (nav "About" → /about). Structure, per the references:
//   1. Hero — halftone-dot portrait centered, name in the bottom-left, a
//      "scroll" cue, coding-since bottom-right.
//   2. Description — headline + bio on the LEFT, the android (robot) on the RIGHT.
//   3. Skills — big-title blocks (index — / Category / items), one per group.
//   4. Contact — giant email, a scrolling tag ribbon, copy-email + socials.
//
// ⚠ PLACEHOLDER: the description headline/bio copy is still a stand-in to be
// replaced in the owner's voice.
// -----------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { HalftonePortrait } from "@/components/HalftonePortrait";
import { HeroStatus } from "@/components/HeroStatus";
import { CodingSince } from "@/components/Hud";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { CONTACT_EMAIL, CONTACT_TAGS, SKILLS, SOCIALS } from "@/lib/about";
import { ABOUT_PANEL } from "@/lib/motion";

const HeroHead = dynamic(
  () => import("@/components/HeroHead").then((m) => m.HeroHead),
  { ssr: false },
);

// Layout effect on the client (runs before paint), plain effect on the server.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function AboutPage() {
  const root = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  // Read Lenis through a ref so the pin setup can run ONCE (stable deps) yet the
  // remeasure below still sees the live instance once it mounts. Depending on
  // `lenis` directly would re-run useGSAP on the null→instance swap and stack a
  // second pin-spacer (doubling the pinned scroll distance).
  const lenis = useSmoothScroll();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

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

  const copyEmail = () => {
    navigator.clipboard?.writeText(CONTACT_EMAIL).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  };

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
          <HalftonePortrait />
        </div>

        {/* Name (bottom-left, over the portrait), like the reference. */}
        <div className="pointer-events-none absolute bottom-24 left-6 text-left sm:bottom-28 sm:left-10">
          <ScrambleText
            as="p"
            entrance="observer"
            className="font-mono text-xs uppercase tracking-[0.3em] text-blue-400"
          >
            / Full-Stack Developer
          </ScrambleText>
          <h1 className="mt-3 font-[family-name:var(--font-relidux)] text-5xl uppercase leading-[0.95] tracking-[0.03em] sm:text-7xl">
            <ScrambleText as="span" entrance="observer" className="block">
              Arif
            </ScrambleText>
            <ScrambleText as="span" entrance="observer" className="block">
              Hasan
            </ScrambleText>
          </h1>
        </div>

        {/* Live status HUD — fills the right side (mid-right, right-aligned). */}
        <div className="pointer-events-none absolute right-6 top-1/2 z-10 -translate-y-1/2 sm:right-10">
          <HeroStatus />
        </div>

        {/* Scroll cue — animated sliding segment (same motion as the projects
            section's case-study cue). Sits above the portrait (z-20). */}
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3 text-blue-400">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
            Scroll
          </span>
          <span className="relative block h-12 w-px overflow-hidden">
            <span className="absolute inset-0 bg-current opacity-20" />
            <span className="scroll-cue-line absolute left-0 top-0 h-1/2 w-full bg-current" />
          </span>
        </div>
        <div className="absolute bottom-10 right-6 sm:right-10">
          <CodingSince />
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
              {/* ⚠ headline copy is a placeholder — tune to taste. */}
              <h2 className="font-[family-name:var(--font-relidux)] text-4xl uppercase leading-[1.02] tracking-[0.03em] sm:text-6xl">
                A full-stack dev
                <br />
                fueled by <span className="text-blue-500">code</span> &amp;{" "}
                <span className="text-blue-500">craft</span>
              </h2>
              <div className="max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
                <p>
                  Full-stack developer based in Sylhet, Bangladesh, with a BSc in
                  Computer Science &amp; Engineering. I build mobile-first products
                  with Flutter and Dart, backed by Node.js, Firebase, and MongoDB —
                  always building, always learning, always shipping.
                </p>
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
      <Career />

      {/* ============================ 3 · SKILLS ========================== */}
      <section className="relative border-t border-white/5 px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <ScrambleText
            as="p"
            entrance="observer"
            className="mb-16 font-mono text-xs uppercase tracking-[0.3em] text-blue-400"
          >
            — Skills
          </ScrambleText>
          <div className="grid gap-x-12 gap-y-16 sm:grid-cols-2">
            {SKILLS.map((cat, i) => (
              <div key={cat.label} data-skill className="flex flex-col gap-3">
                {/* Small eyebrow — index + category name (the former big title). */}
                <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
                  {String(i + 1).padStart(2, "0")} — {cat.label}
                </h3>
                {/* Skills are now the prominent text. */}
                <ScrambleText
                  as="p"
                  entrance="observer"
                  className="text-3xl font-semibold tracking-tight sm:text-4xl"
                >
                  {cat.items.join(" · ")}
                </ScrambleText>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================== 4 · CONTACT ========================== */}
      <section
        id="contact"
        className="relative scroll-mt-24 border-t border-white/5 px-6 pb-24 pt-24 sm:px-10"
      >
        <div className="mx-auto max-w-6xl">
          {/* labels */}
          <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.3em] text-blue-400">
            <span>— Get in touch</span>
            <span className="hidden sm:inline">Now accepting inquiries</span>
          </div>

          {/* giant email */}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-14 block break-words text-[clamp(1.75rem,6.5vw,4.75rem)] font-semibold leading-none tracking-tight text-white transition-colors hover:text-zinc-300"
          >
            arifhasan.connect<span className="text-blue-500">@</span>gmail.com
          </a>

          {/* scrolling tag ribbon */}
          <div className="mt-14 overflow-hidden border-y border-white/5 py-3">
            <div
              data-marquee
              className="flex w-max whitespace-nowrap font-mono text-xs uppercase tracking-[0.2em] text-zinc-500"
            >
              {[...CONTACT_TAGS, ...CONTACT_TAGS].map((tag, i) => (
                <span key={i} className="flex items-center">
                  <span className="mx-6 text-blue-500">•</span>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* copy email + socials + sign-off */}
          <div className="mt-14 flex flex-wrap items-center justify-between gap-y-8">
            <div className="flex flex-wrap items-center gap-8">
              <button
                type="button"
                onClick={copyEmail}
                className="bg-blue-500 px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-blue-400"
              >
                {copied ? "Copied ✓" : "Copy email"}
              </button>
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-400 transition-colors hover:text-white"
                >
                  {s.label} ↗
                </a>
              ))}
            </div>
            <p className="text-right font-mono text-xs uppercase leading-relaxed tracking-[0.2em] text-zinc-500">
              Arif Hasan
              <br />
              Full-Stack Dev
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
