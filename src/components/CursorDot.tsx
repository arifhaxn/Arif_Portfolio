"use client";

// -----------------------------------------------------------------------------
// CursorDot — custom cursor
// -----------------------------------------------------------------------------
// A small white dot that eases toward the real pointer each frame (visible
// catch-up lag), replacing the native cursor. Mounted once at the root so it's
// active on every route.
//
// Fine-pointer / hover devices only: on touch / coarse-pointer there is no
// persistent cursor to chase, so the dot never mounts and the native cursor is
// left untouched (no `cursor: none` override). Under prefers-reduced-motion the
// dot snaps to the pointer with no easing lag (handled inside `cursorChase`).
//
// The per-frame chase runs on the shared GSAP ticker (via `cursorChase`), not a
// raw rAF loop, so it stays in sync with the rest of the motion system.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { cursorChase } from "@/lib/animations";
import { CURSOR } from "@/lib/motion";

export function CursorDot() {
  const dot = useRef<HTMLDivElement>(null);
  // Rendered only where there's a real, hovering pointer. Starts false so SSR and
  // the first client render agree (no hydration mismatch); flipped on after mount.
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      setActive(true);
    }
  }, []);

  // Once active (and the dot element exists), hide the native cursor and drive the
  // dot's position on the GSAP ticker via `cursorChase`.
  useEffect(() => {
    const el = dot.current;
    if (!active || !el) return;

    document.documentElement.classList.add("cursor-none");

    const half = CURSOR.size / 2;
    const setX = gsap.quickSetter(el, "x", "px");
    const setY = gsap.quickSetter(el, "y", "px");
    const setOpacity = gsap.quickSetter(el, "opacity");
    // Seed at center to match cursorChase's start, so there's no first-frame flash
    // at the top-left corner.
    setX(window.innerWidth / 2 - half);
    setY(window.innerHeight / 2 - half);

    const stop = cursorChase((x, y, opacity) => {
      // Offset by half the size so the dot is centered on the pointer.
      setX(x - half);
      setY(y - half);
      setOpacity(opacity);
    });

    return () => {
      stop();
      document.documentElement.classList.remove("cursor-none");
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      ref={dot}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-full bg-white will-change-transform"
      style={{ width: CURSOR.size, height: CURSOR.size }}
    />
  );
}
