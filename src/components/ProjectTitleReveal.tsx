"use client";

// -----------------------------------------------------------------------------
// ProjectTitleReveal
// -----------------------------------------------------------------------------
// The case-study entry moment: the project's name appears HUGE and centered,
// holds for a beat, then the SAME element morphs (GSAP Flip — position + scale)
// into a small, fixed top-left header label that persists for the rest of the
// page. Reuses the Hero name's display treatment (font-semibold, tracking-tight).
//
// The two visual states are plain class/style swaps applied imperatively so Flip
// can capture the "before" box and animate to the "after" box (see
// `projectTitleReveal` in lib/animations — it owns the hold + Flip timings).
//
// Triggering:
//   • On route mount (this phase) — `playOnMount` (default) fires it once the
//     element is in the DOM, before paint.
//   • Imperatively (Phase 3, chaining into the next project without a full route
//     change) — call `.play()` on the forwarded ref.
//
// Reduced motion: no big-centered beat — the label is placed straight into its
// small header slot (handled inside `projectTitleReveal`), and we run the swap in
// a layout effect so there's no flash of the big state.
// -----------------------------------------------------------------------------

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { gsap } from "@/lib/gsap";
import { projectTitleReveal } from "@/lib/animations";
import { PROJECT_TITLE } from "@/lib/motion";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type ProjectTitleRevealHandle = { play: () => void };

// Shared display treatment (matches the Hero "Arif Hasan" name).
const BASE_CLASS =
  "pointer-events-none fixed z-40 m-0 font-semibold tracking-tight text-[#ece7df] will-change-transform";
// Huge, centered.
const BIG_CLASS = `${BASE_CLASS} left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[92vw] text-center leading-[0.95]`;
// Small, fixed top-left (below the navbar), one line.
const SMALL_CLASS = `${BASE_CLASS} left-6 top-[5.25rem] whitespace-nowrap leading-none sm:left-10`;

export const ProjectTitleReveal = forwardRef<
  ProjectTitleRevealHandle,
  { name: string; playOnMount?: boolean }
>(function ProjectTitleReveal({ name, playOnMount = true }, ref) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const applyBig = () => {
    const el = titleRef.current;
    if (!el) return;
    el.className = BIG_CLASS;
    el.style.fontSize = PROJECT_TITLE.fontBig;
  };

  const applySmall = () => {
    const el = titleRef.current;
    if (!el) return;
    el.className = SMALL_CLASS;
    el.style.fontSize = PROJECT_TITLE.fontSmall;
  };

  const play = () => {
    const el = titleRef.current;
    if (!el) return;
    tlRef.current?.kill();
    applyBig(); // reset to the big start state (matters for imperative re-trigger)
    tlRef.current = projectTitleReveal(el, applySmall);
  };

  useImperativeHandle(ref, () => ({ play }), []);

  useIsoLayoutEffect(() => {
    if (playOnMount) play();
    return () => {
      tlRef.current?.kill();
    };
    // Run once on mount; `play` reads live refs so it needn't be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <h1 ref={titleRef} className={BIG_CLASS} style={{ fontSize: PROJECT_TITLE.fontBig }}>
      {name}
    </h1>
  );
});
