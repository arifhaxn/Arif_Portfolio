"use client";

// -----------------------------------------------------------------------------
// LiquidButton — cream pill with a liquid black fill on hover / press
// -----------------------------------------------------------------------------
// Rest: a cream pill, dark label, and a black circular badge (left) holding a
// white right-arrow. On hover (fine pointer) / press (touch) the badge floods
// horizontally to fill the whole pill black — pill corners kept throughout so it
// reads as a liquid fill, not a growing rectangle — the label crossfades to white,
// the arrow stays white, and a small droplet detaches below the badge and falls.
//
//   • Fill/label = a paused, reversible GSAP timeline (play on enter, reverse on
//     leave); the droplet is a one-shot fired on each state change.
//   • The full width is measured from the DOM (and re-measured on resize) so the
//     fill lands exactly on the pill's inner edge regardless of label length.
//   • Reduced motion: the state snaps (no tween, no droplet) — instant feedback
//     beats no feedback for an interaction this small.
//   • Touch: no hover, so :active-style press (touchstart→fill, touchend→retract)
//     stands in, minus the droplet.
//
// Reusable by design (the house pattern for shared UI). Currently used once, on
// the About contact section — flagged to Arif in case it wants wider reuse.
// -----------------------------------------------------------------------------

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import {
  liquidDroplet,
  liquidFillTimeline,
  prefersReducedMotion,
} from "@/lib/animations";
import { LIQUID } from "@/lib/motion";
import { uiScale } from "@/lib/uiScale";

// Rest badge inset from the pill edges (px). The fill floods from this inset
// circle out to edge-to-edge (inset → 0) on hover.
const INSET = 6;
// The same inset as CSS, for the markup's pre-GSAP first paint. Kept in rem so it
// tracks the large-display UI scale (lib/uiScale) exactly the way `INSET *
// uiScale()` does below — the two must agree or the badge would jump on mount.
const INSET_CSS = `${INSET / 16}rem`;

type LiquidButtonProps = {
  children: ReactNode;
  /** Render as a link (internal route via next/link) — otherwise a <button>. */
  href?: string;
  /** Click handler — passed straight to the element (may preventDefault + route). */
  onClick?: React.MouseEventHandler;
  className?: string;
  "aria-label"?: string;
};

export function LiquidButton({
  children,
  href,
  onClick,
  className = "",
  ...rest
}: LiquidButtonProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const dropRef = useRef<HTMLSpanElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const openRef = useRef(false);

  // Build (and rebuild on resize) the reversible fill timeline from measured
  // geometry so the flood lands exactly on the pill's inner right edge.
  useEffect(() => {
    const root = rootRef.current;
    const fill = fillRef.current;
    const label = labelRef.current;
    if (!root || !fill || !label) return;

    const build = () => {
      // The pill itself is rem-sized and grows on a large display (lib/uiScale),
      // so a fixed 6px ring around the badge would read as a tighter and tighter
      // hairline there. Scale it with the pill.
      const inset = INSET * uiScale();
      const restW = Math.max(0, root.clientHeight - inset * 2); // inset circle diameter
      tlRef.current?.kill();
      tlRef.current = liquidFillTimeline({
        fill,
        label,
        // Rest: an inset circle badge on the left.
        from: { top: inset, left: inset, bottom: inset, width: restW },
        // Filled: edge-to-edge flood (pill corners kept via border-radius).
        to: { top: 0, left: 0, bottom: 0, width: root.clientWidth },
      });
      // Keep the current open/closed state across a rebuild.
      tlRef.current.progress(openRef.current ? 1 : 0);
    };

    build();
    const ro = new ResizeObserver(build);
    ro.observe(root);
    return () => {
      ro.disconnect();
      tlRef.current?.kill();
    };
  }, []);

  const setOpen = (open: boolean) => {
    if (open === openRef.current) return;
    openRef.current = open;
    const tl = tlRef.current;
    if (!tl) return;
    if (prefersReducedMotion()) {
      tl.progress(open ? 1 : 0).pause();
      return;
    }
    if (open) tl.play();
    else tl.reverse();
    if (dropRef.current) liquidDroplet(dropRef.current);
  };

  const handlers = {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    onTouchStart: () => setOpen(true),
    onTouchEnd: () => setOpen(false),
    onTouchCancel: () => setOpen(false),
  };

  // Shared visual: the pill body, fill, arrow badge, label, droplet.
  const inner = (
    <>
      {/* Liquid fill — the black badge that floods to full width. Inset + fully
          rounded so it stays a pill and never spills past the button. */}
      <span
        ref={fillRef}
        aria-hidden
        className="pointer-events-none absolute z-0 rounded-full"
        style={{
          top: INSET_CSS,
          left: INSET_CSS,
          bottom: INSET_CSS,
          width: "2.25rem",
          backgroundColor: LIQUID.ink,
        }}
      />
      {/* Droplet — detaches just below the badge and falls. Outside any clip so it
          can fall past the pill's bottom edge. */}
      <span
        ref={dropRef}
        aria-hidden
        className="pointer-events-none absolute left-[1.25rem] z-0 h-2 w-2 rounded-full"
        style={{ top: "calc(100% - 0.6rem)", opacity: 0, backgroundColor: LIQUID.ink }}
      />
      {/* Content sits above the fill. */}
      <span className="relative z-10 flex items-center gap-3 py-1.5 pl-1.5 pr-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-full text-white">
          {/* right arrow */}
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
        {/* Rest colour comes from the class (reliable even before GSAP first
            renders); the fill timeline animates the inline `color` on hover, which
            overrides the class. */}
        <span
          ref={labelRef}
          className="text-[0.9375rem] font-semibold tracking-tight text-[#0a0a0a]"
        >
          {children}
        </span>
      </span>
    </>
  );

  const shared =
    "group relative inline-flex select-none items-center rounded-full ring-2 ring-transparent transition-shadow duration-300 hover:ring-white/80 active:ring-white/80 " +
    className;
  const style = { backgroundColor: LIQUID.cream };

  if (href) {
    return (
      <Link
        ref={rootRef as React.RefObject<HTMLAnchorElement>}
        href={href}
        onClick={onClick}
        className={shared}
        style={style}
        {...handlers}
        {...rest}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      ref={rootRef as React.RefObject<HTMLButtonElement>}
      type="button"
      onClick={onClick}
      className={shared}
      style={style}
      {...handlers}
      {...rest}
    >
      {inner}
    </button>
  );
}
