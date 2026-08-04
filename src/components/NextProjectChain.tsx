"use client";

// -----------------------------------------------------------------------------
// NextProjectChain — scroll-past-end loading ring that chains to the next project
// -----------------------------------------------------------------------------
// After the gallery, a spacer gives scroll room "past the end." Scrolling through
// it scrubs a ring (0→100) that FOLLOWS THE CURSOR (fixed bottom-center on touch),
// with a live 1–100 counter inside and the next project's name beside it, stroked
// in that project's themeColor. Because it's scrubbed, scrolling back up before
// 100 reverses and cancels it (fades out as you return to the content). At 100 it
// chains into the next project (looping after the last) via client-side nav, with
// the pixel-reveal cover suppressed so the ring-fill IS the transition.
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
import { nextProject } from "@/lib/projects";
import { suppressNextPixelReveal } from "@/lib/revealControl";

export function NextProjectChain({ currentSlug }: { currentSlug: string }) {
  const next = nextProject(currentSlug);
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

  useGSAP(
    () => {
      if (prefersReducedMotion()) return; // static link handles it (CSS below)
      const wrap = ringWrapRef.current;
      const circle = progressRef.current;
      const counter = counterRef.current;
      const spacer = spacerRef.current;
      if (!wrap || !circle || !spacer) return;

      const touch = window.matchMedia("(hover: none)").matches;

      // Position: follow the cursor on desktop; parked bottom-center on touch.
      let stopPointer = () => {};
      if (touch) {
        wrap.style.left = "50%";
        wrap.style.top = "auto";
        wrap.style.bottom = "3.5rem";
        wrap.style.transform = "translateX(-50%)";
      } else {
        const onMove = (e: PointerEvent) => {
          // Center the RING on the cursor; the name trails to its right.
          wrap.style.transform = `translate(${e.clientX - SIZE / 2}px, ${e.clientY - SIZE / 2}px)`;
        };
        window.addEventListener("pointermove", onMove);
        stopPointer = () => window.removeEventListener("pointermove", onMove);
      }

      const setProgress = (p: number) => {
        p = p < 0 ? 0 : p > 1 ? 1 : p;
        circle.style.strokeDashoffset = String(CIRC * (1 - p));
        if (counter) counter.textContent = String(Math.round(p * 100));
        wrap.style.opacity = String(Math.min(1, p / NEXT_PROJECT.fadeIn));
      };
      setProgress(0);

      const st = ScrollTrigger.create({
        trigger: spacer,
        start: "top bottom", // content end reached (spacer enters from viewport bottom)
        end: "bottom bottom", // spacer fully scrolled → 100
        scrub: true,
        onUpdate: (self) => {
          setProgress(self.progress);
          if (self.progress >= 0.999 && !navigatedRef.current) {
            navigatedRef.current = true;
            suppressNextPixelReveal();
            router.push(`/projects/${next.slug}`);
          }
        },
      });

      return () => {
        stopPointer();
        st.kill();
      };
    },
    { scope: root, dependencies: [next.slug] },
  );

  return (
    <div ref={root}>
      {/* Scroll runway past the content (removed under reduced motion). */}
      <div
        ref={spacerRef}
        aria-hidden
        className="motion-reduce:hidden"
        style={{ height: NEXT_PROJECT.runway }}
      />

      {/* Pointer-following ring + counter + next title. */}
      <div
        ref={ringWrapRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[90] flex items-center gap-5 opacity-0 will-change-transform motion-reduce:hidden"
      >
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} className="-rotate-90">
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
          <span className="block font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">
            Next project
          </span>
          <span className="block text-2xl font-bold text-white sm:text-3xl">
            {next.name}
          </span>
        </div>
      </div>

      {/* Reduced-motion affordance: a plain link, no gesture/ring. */}
      <div className="hidden justify-center px-6 pb-32 motion-reduce:flex">
        <Link
          href={`/projects/${next.slug}`}
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:text-white"
        >
          Next project: {next.name}
          <span aria-hidden>↓</span>
        </Link>
      </div>
    </div>
  );
}
