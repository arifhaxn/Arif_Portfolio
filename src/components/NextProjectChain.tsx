"use client";

// -----------------------------------------------------------------------------
// NextProjectChain — scroll-past-end loading ring that chains to the next project
// -----------------------------------------------------------------------------
// Once you scroll to the end of the content, a ring FIXED at bottom-center
// AUTO-COUNTS 0→100 on its own (time-based, not scroll-driven), with a live 1–100
// counter inside and a "Next project" label + the next project's name beside it,
// stroked in that project's themeColor. Scrolling back up into the content before
// it completes reverses the count and fades it out (cancelable). At 100 it chains
// into the next project (looping after the last) via client-side nav, with the
// pixel-reveal cover suppressed so the ring/title reveal IS the transition.
//
// Reduced motion: no ring/gesture — a static "next project" link (CSS
// motion-reduce variants swap the visuals; the effect no-ops in JS).
// -----------------------------------------------------------------------------

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/animations";
import { NEXT_PROJECT } from "@/lib/motion";
import type { Project } from "@/lib/projects";
import { suppressNextPixelReveal } from "@/lib/revealControl";

export function NextProjectChain({
  next,
  label,
}: {
  next: Project;
  label: string;
}) {
  const themeColor = next.themeColor ?? next.accent ?? "#ffffff";
  const router = useRouter();

  const root = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const ringWrapRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<SVGCircleElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const navigatedRef = useRef(false);

  const SIZE = NEXT_PROJECT.ringSize;
  const RADIUS = SIZE / 2 - NEXT_PROJECT.ringStroke - 2;
  const CIRC = 2 * Math.PI * RADIUS;
  // The ring's geometry below stays in SIZE-based USER units (so RADIUS/CIRC and
  // the dashoffset animation are untouched); a viewBox maps those onto a box laid
  // out in rem, which rides the large-display UI scale (globals.css / lib/uiScale).
  // Without it the ring alone stayed 96px on a big monitor while its rem-sized
  // counter grew — a "100" outgrowing the circle it sits inside.
  const SIZE_CSS = `${SIZE / 16}rem`;

  useGSAP(
    () => {
      if (prefersReducedMotion()) return; // static link handles it (CSS below)
      const wrap = ringWrapRef.current;
      const circle = progressRef.current;
      const counter = counterRef.current;
      const spacer = spacerRef.current;
      if (!wrap || !circle || !spacer) return;

      const state = { v: 0 };
      const setProgress = (p: number) => {
        p = p < 0 ? 0 : p > 1 ? 1 : p;
        circle.style.strokeDashoffset = String(CIRC * (1 - p));
        if (counter) counter.textContent = String(Math.round(p * 100));
        wrap.style.opacity = String(Math.min(1, p / NEXT_PROJECT.fadeIn));
      };
      setProgress(0);

      // The ring AUTO-COUNTS 0→100 on its own (time-based, not scroll-driven).
      const count = gsap.to(state, {
        v: 1,
        duration: NEXT_PROJECT.countDuration,
        ease: "none",
        paused: true,
        onUpdate: () => setProgress(state.v),
        onComplete: () => {
          if (navigatedRef.current) return;
          navigatedRef.current = true;
          suppressNextPixelReveal();
          router.push(`/projects/${next.slug}`);
        },
      });

      // Reaching the end region starts the count; scrolling back up into the
      // content reverses it (counts down + fades out) — cancelable until it hits 100.
      const st = ScrollTrigger.create({
        trigger: spacer,
        start: "top center",
        end: "max",
        onEnter: () => count.play(),
        onLeaveBack: () => count.reverse(),
      });

      return () => {
        count.kill();
        st.kill();
      };
    },
    { scope: root, dependencies: [next.slug] },
  );

  return (
    <div ref={root}>
      {/* Scroll runway past the content (removed under reduced motion). Opaque +
          above the frozen title (z-10) so the fixed entry title/scroll-cue don't
          show through at the very bottom of the page. */}
      <div
        ref={spacerRef}
        aria-hidden
        className="relative z-20 bg-black motion-reduce:hidden"
        style={{ height: NEXT_PROJECT.runway }}
      />

      {/* Fixed bottom-center ring + counter + next title. */}
      <div
        ref={ringWrapRef}
        aria-hidden
        className="pointer-events-none fixed bottom-10 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-5 opacity-0 motion-reduce:hidden"
      >
        <div className="relative shrink-0" style={{ width: SIZE_CSS, height: SIZE_CSS }}>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={{ width: SIZE_CSS, height: SIZE_CSS }}
            className="-rotate-90"
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={NEXT_PROJECT.ringStroke}
            />
            <circle
              ref={progressRef}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={themeColor}
              strokeWidth={NEXT_PROJECT.ringStroke}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC}
            />
          </svg>
          <span
            ref={counterRef}
            className="absolute inset-0 flex items-center justify-center font-mono text-lg text-white"
          >
            0
          </span>
        </div>
        <div className="whitespace-nowrap">
          <span className="block font-mono text-[0.625rem] uppercase tracking-[0.3em] text-zinc-400">
            {label}
          </span>
          <span className="block text-2xl font-bold text-white sm:text-3xl">
            {next.name}
          </span>
        </div>
      </div>

      {/* Reduced-motion affordance: a plain link, no gesture/ring. */}
      <div className="relative z-20 hidden justify-center bg-black px-6 pb-32 pt-[40vh] motion-reduce:flex">
        <Link
          href={`/projects/${next.slug}`}
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:text-white"
        >
          {label}: {next.name}
          <span aria-hidden>↓</span>
        </Link>
      </div>
    </div>
  );
}
