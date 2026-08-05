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

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useGSAP } from "@/lib/gsap";
import { floatLoop, marqueeLoop, scrollReveal } from "@/lib/animations";
import { ScrambleText } from "@/components/ScrambleText";
import { HalftonePortrait } from "@/components/HalftonePortrait";
import { CodingSince } from "@/components/Hud";
import { CONTACT_EMAIL, CONTACT_TAGS, SKILLS, SOCIALS } from "@/lib/about";

const HeroHead = dynamic(
  () => import("@/components/HeroHead").then((m) => m.HeroHead),
  { ssr: false },
);

export default function AboutPage() {
  const root = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useGSAP(
    () => {
      // (The hero portrait runs its own dot-assembly entrance in HalftonePortrait.)
      scrollReveal("[data-desc]", { y: 24 }, "top 85%");
      scrollReveal("[data-skill]", { y: 24 }, "top 88%");
      scrollReveal("[data-contact]", { y: 24 }, "top 88%");
      floatLoop("[data-float]");
      const track = root.current?.querySelector("[data-marquee]");
      if (track) marqueeLoop(track);
    },
    { scope: root },
  );

  const copyEmail = () => {
    navigator.clipboard?.writeText(CONTACT_EMAIL).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <main ref={root} className="bg-black text-white">
      {/* ============================ 1 · HERO ============================= */}
      <section className="relative min-h-screen overflow-hidden px-6 pt-28 sm:px-10">
        {/* Halftone-dot portrait (canvas), centered in the viewport behind the
            text — absolute inset-0 so the section's top padding doesn't push it
            low. */}
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
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
          <h1 className="mt-3 text-6xl font-semibold leading-[0.9] tracking-tight sm:text-8xl">
            <ScrambleText as="span" entrance="observer" className="block">
              Arif
            </ScrambleText>
            <ScrambleText as="span" entrance="observer" className="block">
              Hasan
            </ScrambleText>
          </h1>
        </div>

        {/* Scroll cue + coding-since. */}
        <span className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
          Scroll ↓
        </span>
        <div className="absolute bottom-10 right-6 sm:right-10">
          <CodingSince />
        </div>
      </section>

      {/* ========================= 2 · DESCRIPTION ======================== */}
      <section className="relative border-t border-white/5 px-6 py-24 sm:px-10">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          {/* LEFT — headline + bio */}
          <div data-desc className="flex flex-col gap-8">
            {/* ⚠ headline copy is a placeholder — tune to taste. */}
            <h2 className="text-5xl font-semibold leading-[0.95] tracking-tight sm:text-7xl">
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
      </section>

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
