// -----------------------------------------------------------------------------
// uiScale — the large-display UI scale, readable from JavaScript
// -----------------------------------------------------------------------------
// globals.css makes the public site's ROOT FONT SIZE fluid above the reference
// viewport (~1920×900), so every rem-based Tailwind utility — type, spacing,
// widths, radii — grows on a big monitor and the 1920px composition is
// reproduced at scale instead of shrinking inside a wider frame.
//
// A handful of visuals can't ride that for free because they size themselves in
// raw pixels from JS rather than in rem from CSS: the career timeline's SVG
// connector, the skills-constellation canvas, the cursor dot, the liquid
// button's inset badge. Left alone they'd stay 1920-sized while everything
// around them grew — the exact shrinking this change exists to fix.
//
// `uiScale()` recovers the factor CSS is already applying, so those pixels can
// be multiplied into the same coordinate space:
//
//     const S = uiScale();          // 1 at ≤1920px wide, 1.333 at 2560, …
//     ctx.setTransform(dpr * S, 0, 0, dpr * S, 0, 0);
//
// It reads the computed root font size rather than recomputing the clamp, so it
// can never drift out of sync with the stylesheet — and it returns 1 wherever
// the scale isn't applied (during SSR, and on /admin, which opts out).
// -----------------------------------------------------------------------------

import { useEffect, useState } from "react";

/** Root font size (px) the fluid scale is expressed relative to. */
export const UI_BASE_PX = 16;

/**
 * Current UI scale: 1 at or below the reference viewport, >1 on larger displays.
 * Safe on the server (returns 1) and cheap enough to call from a resize handler,
 * but not from a per-frame render loop — cache it per layout pass.
 */
export function uiScale(): number {
  if (typeof document === "undefined") return 1;
  const px = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(px) && px > 0 ? px / UI_BASE_PX : 1;
}

/**
 * `uiScale()` as reactive state, for components that need it during render
 * rather than inside an effect. Starts at 1 so server and first client render
 * agree (no hydration mismatch), then settles on the real value after mount and
 * follows window resizes.
 */
export function useUiScale(): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const read = () => setScale(uiScale());
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return scale;
}
