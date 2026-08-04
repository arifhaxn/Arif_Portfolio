"use client";

// -----------------------------------------------------------------------------
// PixelReveal — pixelated top-to-bottom cover that peels away
// -----------------------------------------------------------------------------
// Mounted once in the root layout so it persists across client-side navigations.
// A full-viewport fixed grid of solid near-black cells sits above everything; on
// first load and on every route change it covers the screen and then dissolves
// away in a top-to-bottom wave (see `pixelRevealOut`). The real content is
// already rendered underneath — the cover just peels off it, it does not
// "build" the content.
//
//   • usePathname() detects route changes. First mount: dissolve after a short
//     delay. Subsequent changes: snap back to fully covered BEFORE paint (a
//     layout effect), so the new route's content is never seen mid-swap, then
//     dissolve after a brief delay to let it mount underneath.
//   • Cells are always mounted (never unmounted), so a resize can recompute the
//     grid without a cover flash — when revealed, the container is held at
//     opacity 0, hiding any re-rendered (default-opaque) cells.
//   • Grid: cols/rows derived from the viewport to keep cells ~square, clamped so
//     the cell count stays reasonable (~250-340). Recomputed on resize.
//   • Reduced motion: the container is display:none via CSS (`motion-reduce`),
//     and the JS no-ops — content just appears/swaps instantly.
// -----------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "@/lib/gsap";
import {
  pixelRevealCoverInstant,
  pixelRevealOut,
  prefersReducedMotion,
} from "@/lib/animations";
import { PIXEL_REVEAL } from "@/lib/motion";
import { consumePixelRevealSkip } from "@/lib/revealControl";

// Layout effect on the client (before paint), plain effect on the server (no-op)
// to avoid the SSR useLayoutEffect warning.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Stable server/first-client dims so hydration matches; recomputed on mount.
const DEFAULT_DIMS = { cols: 22, rows: 13 };

// Routes that opt OUT of the pixel reveal (no cover, no dissolve).
const EXCLUDED = new Set(["/", "/about"]);

function computeDims() {
  if (typeof window === "undefined") return DEFAULT_DIMS;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cols = Math.min(
    PIXEL_REVEAL.maxCols,
    Math.max(PIXEL_REVEAL.minCols, Math.round(vw / PIXEL_REVEAL.targetCell)),
  );
  const cellPx = vw / cols;
  const rows = Math.max(6, Math.round(vh / cellPx));
  return { cols, rows };
}

export function PixelReveal() {
  const overlay = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState(DEFAULT_DIMS);
  const colsRef = useRef(DEFAULT_DIMS.cols);
  const firstRef = useRef(true);
  const pathname = usePathname();

  // Recompute the grid on mount + resize (keeps cells ~square).
  useEffect(() => {
    const recompute = () => {
      const d = computeDims();
      colsRef.current = d.cols;
      setDims(d);
    };
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);

  // Cover + dissolve on first mount and on every pathname change.
  useIsoLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    // Excluded routes (/, /about): no reveal. The `hidden` class below keeps the
    // overlay out of the DOM flow; mark first-load consumed so a later navigation
    // to an included route still plays as a route change.
    if (EXCLUDED.has(pathname)) {
      firstRef.current = false;
      return;
    }
    const el = overlay.current;
    if (!el) return;
    const cells = el.querySelectorAll("[data-pixel-cell]");
    if (!cells.length) return;

    const dissolve = () => {
      gsap.set(el, { opacity: 1, pointerEvents: "auto" });
      pixelRevealOut(cells, colsRef.current, () =>
        gsap.set(el, { opacity: 0, pointerEvents: "none" }),
      );
    };

    if (firstRef.current) {
      // Initial load: cells already cover (default). Dissolve after a beat.
      firstRef.current = false;
      const t = gsap.delayedCall(PIXEL_REVEAL.initialDelay, dissolve);
      return () => {
        t.kill();
      };
    }

    // Seamless chain (next-project ring): skip the cover entirely for this one
    // navigation so the ring-fill + title reveal isn't layered under a second
    // transition. Keep the overlay hidden.
    if (consumePixelRevealSkip()) {
      gsap.set(el, { opacity: 0, pointerEvents: "none" });
      return;
    }

    // Route change: snap back to fully covered before paint, then dissolve once
    // the new route has had a moment to mount underneath.
    gsap.set(el, { opacity: 1, pointerEvents: "auto" });
    pixelRevealCoverInstant(cells);
    const t = gsap.delayedCall(PIXEL_REVEAL.swapDelay, dissolve);
    return () => {
      t.kill();
    };
  }, [pathname]);

  return (
    <div
      ref={overlay}
      aria-hidden
      // Excluded routes hide the whole overlay (display:none) — computed at
      // render so there's no cover flash on first paint of / or /about.
      className={`fixed inset-0 z-[100] grid motion-reduce:hidden ${
        EXCLUDED.has(pathname) ? "hidden" : ""
      }`}
      style={{
        gridTemplateColumns: `repeat(${dims.cols}, 1fr)`,
        gridTemplateRows: `repeat(${dims.rows}, 1fr)`,
      }}
    >
      {Array.from({ length: dims.cols * dims.rows }).map((_, i) => (
        <div key={i} data-pixel-cell className="bg-black will-change-transform" />
      ))}
    </div>
  );
}
