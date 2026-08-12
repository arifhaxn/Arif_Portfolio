"use client";

// -----------------------------------------------------------------------------
// ScrambleText — reusable text decode/scramble primitive
// -----------------------------------------------------------------------------
// Wraps a run of text so it can "decode" (characters cycle through random glyphs
// and lock in left-to-right) both on entrance and on hover.
//
//   <ScrambleText>Full-Stack Developer</ScrambleText>
//   <ScrambleText as="h1">Arif Hasan</ScrambleText>
//
// Design:
//   • The REAL text stays the accessible name (aria-label on the wrapper); the
//     animated, garble-able text is an aria-hidden inner span. Screen readers
//     never see mid-scramble garbage; SEO/DOM keeps the real string.
//   • Entrance is idempotent (`play()` runs once). Parent entrance timelines
//     (navIntro / heroTitleIn / scrollReveal) call it via the node's registered
//     `__scramblePlay` at the exact instant they start that element's fade+rise —
//     so the scramble rides the existing stagger, it doesn't add a second one.
//     For elements with no such helper, set `entrance="observer"` and it triggers
//     itself on scroll-into-view (IntersectionObserver at the site's threshold).
//   • Hover (pointerenter) replays the scramble, but only AFTER the entrance has
//     run. Skipped on touch (no hover) — entrance still runs there.
//   • prefers-reduced-motion: no scrambling at all; text just sits as final text.
//   • Word boundaries: spaces are preserved, never scrambled (handled in
//     `scrambleText`).
// -----------------------------------------------------------------------------

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ElementType,
  type HTMLAttributes,
} from "react";
import type { gsap } from "@/lib/gsap";
import { prefersReducedMotion, scrambleText } from "@/lib/animations";

export type ScrambleHandle = { play: () => void };

type ScrambleTextProps = {
  /** The literal text to display and scramble (kept as the accessible name). */
  children: string;
  /** Rendered tag — defaults to <span>. */
  as?: ElementType;
  className?: string;
  /**
   * "manual" (default): a parent timeline drives the entrance via play().
   * "observer": self-trigger the entrance on scroll-into-view.
   */
  entrance?: "manual" | "observer";
} & Omit<HTMLAttributes<HTMLElement>, "children">;

export const ScrambleText = forwardRef<ScrambleHandle, ScrambleTextProps>(
  function ScrambleText(
    { children, as, className, entrance = "manual", ...rest },
    ref,
  ) {
    // Polymorphic tag. Cast to a permissive component type so spreading
    // arbitrary HTML props + ref type-checks for any element choice.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Tag = (as ?? "span") as any;
    const text = children;

    const rootRef = useRef<HTMLElement | null>(null);
    const innerRef = useRef<HTMLSpanElement | null>(null);
    const tweenRef = useRef<gsap.core.Tween | null>(null);
    const enteredRef = useRef(false);

    // Release a previously pinned height (see below).
    const releaseHeight = () => {
      const root = rootRef.current;
      if (root) root.style.height = "";
    };

    const scramble = () => {
      const el = innerRef.current;
      if (!el) return;
      if (prefersReducedMotion()) {
        el.textContent = text;
        return;
      }
      tweenRef.current?.kill();

      // Layout-shift guard: the scramble swaps each character for a random glyph
      // of the SAME count but a DIFFERENT width, so a line can flip between 1 and
      // 2 wrapped lines frame-to-frame. If the element grew/shrank each frame it
      // would reflow everything below it (e.g. the contact section jitters while a
      // skills line scrambles). Pin the box to its settled (final-text) height for
      // the duration — a transient extra line overflows harmlessly instead of
      // pushing siblings. Measure with any prior lock cleared so it's the natural
      // height. (No-op for inline/single-line uses, where nothing ever rewraps.)
      const root = rootRef.current;
      if (root) {
        root.style.height = "";
        const h = root.getBoundingClientRect().height;
        if (h > 0) root.style.height = `${h}px`;
      }

      tweenRef.current = scrambleText(el, text);
      // Release the lock once the scramble settles (or is otherwise resolved).
      tweenRef.current.then(releaseHeight, releaseHeight);
    };

    // Entrance — idempotent (first call wins).
    const playEntrance = () => {
      if (enteredRef.current) return;
      enteredRef.current = true;
      scramble();
    };
    // Hover — replays, but only once the entrance has already run.
    const playHover = () => {
      if (enteredRef.current) scramble();
    };

    // playEntrance is closure-stable (only touches refs); expose it once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useImperativeHandle(ref, () => ({ play: playEntrance }), []);

    useEffect(() => {
      const node = rootRef.current as (HTMLElement & { __scramblePlay?: () => void }) | null;
      if (node) node.__scramblePlay = playEntrance;

      let io: IntersectionObserver | null = null;
      if (entrance === "observer" && !prefersReducedMotion() && node) {
        io = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting) {
              playEntrance();
              io?.disconnect();
            }
          },
          { rootMargin: "0px 0px -10% 0px" }, // ~matches the site's reveal START
        );
        io.observe(node);
      }

      return () => {
        io?.disconnect();
        tweenRef.current?.kill();
        releaseHeight();
        if (node) delete node.__scramblePlay;
      };
      // Handlers are stable for this element's lifetime.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <Tag
        ref={rootRef}
        data-scramble
        aria-label={text}
        onPointerEnter={playHover}
        className={className}
        {...rest}
      >
        <span ref={innerRef} aria-hidden="true">
          {text}
        </span>
      </Tag>
    );
  },
);
