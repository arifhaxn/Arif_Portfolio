"use client";

// -----------------------------------------------------------------------------
// About — hero-style intro + robot centerpiece + skills / achievements / connect
// -----------------------------------------------------------------------------
// Structure mirrors the Hero: eyebrow → large heading → supporting text, with
// the android robot (shared <HeroHead shape="robot" />) as the top centerpiece —
// same role the polyhedron plays in the Hero, inheriting mouse-tracking, pose
// cross-fade, and all performance safeguards. Below it, scrolling content blocks
// (skills, achievements, connect) reveal with the established one-shot
// `scrollReveal` pattern; small floating props drift near the robot via
// `floatLoop`. HUD corners (live clock/status + coding-since meta) match Hero's.
//
// PLACEHOLDERS awaiting real content from the site owner (also see summary):
//   • Bio paragraph — DRAFT, to be rewritten in the owner's voice.
//   • Achievements — intentionally EMPTY slots; do not invent awards.
//   • Coding-since year — "20XX" in components/Hud.tsx (CODING_SINCE_YEAR).
// -----------------------------------------------------------------------------

import { useRef } from "react";
import dynamic from "next/dynamic";
import { useGSAP } from "@/lib/gsap";
import { floatLoop, scrollReveal } from "@/lib/animations";
import { CodingSince, LiveStatus } from "@/components/Hud";

const HeroHead = dynamic(
  () => import("@/components/HeroHead").then((m) => m.HeroHead),
  { ssr: false },
);

const SKILLS: { label: string; items: string[] }[] = [
  { label: "Languages", items: ["Dart", "C++", "Python"] },
  { label: "Frontend", items: ["Flutter"] },
  { label: "Backend", items: ["Node.js"] },
  { label: "Database", items: ["Firebase", "MongoDB"] },
  { label: "Infra", items: ["Vercel", "Docker", "Git"] },
  { label: "Tools", items: ["VS Code", "Android Studio", "Figma"] },
];

const SOCIALS: { label: string; href: string }[] = [
  { label: "GitHub", href: "https://github.com/arifhaxn" },
  { label: "LinkedIn", href: "https://linkedin.com/in/arif-hasan-672249358" },
  { label: "Instagram", href: "https://instagram.com/arifhaxn" },
  { label: "Facebook", href: "https://facebook.com/arifhaxnn" },
  { label: "Email", href: "mailto:arifhasan.connect@gmail.com" },
];

export function About() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      // Established one-shot reveals, one call per content block so each fires
      // as it enters the viewport (same tokens/easing site-wide).
      scrollReveal("[data-about-intro]");
      scrollReveal("[data-skill-cat]", { y: 24 });
      scrollReveal("[data-achievement]", { y: 24 });
      scrollReveal("[data-connect]", { y: 24 });

      // Ambient drift on the floating props near the robot.
      floatLoop("[data-float]");
    },
    { scope: root },
  );

  return (
    <section id="about" ref={root} className="relative bg-black px-6 sm:px-10">
      {/* ================= Hero-style intro block =========================== */}
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-10 py-24 text-center">
        {/* Robot centerpiece with floating decorative props. */}
        <div className="relative">
          {/* Floating props — abstract wireframe-flavored marks, ambient only. */}
          <div
            aria-hidden
            data-float
            className="pointer-events-none absolute -left-10 top-8 h-3 w-3 rotate-45 border border-zinc-700"
          />
          <div
            aria-hidden
            data-float
            className="pointer-events-none absolute -right-8 top-1/3 h-2 w-2 rounded-full bg-blue-500/60"
          />
          <div
            aria-hidden
            data-float
            className="pointer-events-none absolute -left-4 bottom-12 font-mono text-sm text-zinc-600"
          >
            +
          </div>
          <div
            aria-hidden
            className="relative aspect-square w-[clamp(16rem,34vw,26rem)]"
          >
            <HeroHead shape="robot" />
          </div>
        </div>

        {/* Eyebrow → large heading → bio, mirroring the Hero's type stack. */}
        <div className="flex max-w-2xl flex-col items-center gap-4">
          <p
            data-about-intro
            className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500"
          >
            / About
          </p>
          <h2
            data-about-intro
            className="text-4xl font-semibold tracking-tight text-white sm:text-6xl"
          >
            Building. Learning. Shipping.
          </h2>
          {/*
            ⚠ DRAFT BIO — placeholder copy assembled from confirmed facts only.
            The site owner will rewrite this in his own voice.
          */}
          <p data-about-intro className="text-sm text-zinc-400 sm:text-base">
            Full-stack developer based in Sylhet, Bangladesh, with a BSc in
            Computer Science and Engineering. I build mobile-first products
            with Flutter and Dart, backed by Node.js, Firebase, and MongoDB —
            always building, always learning, always shipping.
          </p>
        </div>

        {/* HUD corners — same pattern as the Hero. */}
        <div data-about-intro className="absolute bottom-8 left-0 sm:left-4">
          <LiveStatus />
        </div>
        <div data-about-intro className="absolute bottom-8 right-0 sm:right-4">
          <CodingSince />
        </div>
      </div>

      {/* ================= Skills =========================================== */}
      <div className="mx-auto max-w-4xl py-24">
        <p
          data-skill-cat
          className="mb-10 text-xs font-medium uppercase tracking-[0.3em] text-zinc-500"
        >
          / Skills
        </p>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {SKILLS.map((cat) => (
            <div key={cat.label} data-skill-cat className="flex flex-col gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                {cat.label}
              </p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {cat.items.map((item) => (
                  <li key={item} className="text-sm text-zinc-300">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ================= Achievements (intentionally empty) =============== */}
      {/* ⚠ PLACEHOLDER — no achievements content yet. These are empty slots
          awaiting real awards/accomplishments from the site owner; nothing here
          is to be invented. */}
      <div className="mx-auto max-w-4xl py-24">
        <p
          data-achievement
          className="mb-10 text-xs font-medium uppercase tracking-[0.3em] text-zinc-500"
        >
          / Achievements
        </p>
        <div className="grid gap-6 sm:grid-cols-3">
          {[1, 2, 3].map((slot) => (
            <div
              key={slot}
              data-achievement
              className="flex h-28 items-center justify-center rounded-xl border border-dashed border-zinc-800"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                Coming soon
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ================= Connect (single home for socials) ================ */}
      {/* id="contact": the nav's CONTACT link lands here — socials live in this
          one block only, so there's no duplicated contact content elsewhere. */}
      <div id="contact" className="mx-auto max-w-4xl scroll-mt-24 pb-32 pt-24">
        <p
          data-connect
          className="mb-10 text-xs font-medium uppercase tracking-[0.3em] text-zinc-500"
        >
          / Connect
        </p>
        <ul className="flex flex-wrap gap-x-8 gap-y-4">
          {SOCIALS.map((s) => (
            <li key={s.label} data-connect>
              <a
                href={s.href}
                target={s.href.startsWith("mailto:") ? undefined : "_blank"}
                rel={s.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                className="text-sm font-medium uppercase tracking-[0.15em] text-zinc-300 underline underline-offset-4 transition-colors hover:text-white"
              >
                {s.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
