"use client";

// -----------------------------------------------------------------------------
// AchievementModal
// -----------------------------------------------------------------------------
// Certificate lightbox opened by clicking/tapping a card. A small card floats
// over the blurred screen: the panel zooms up and the image materializes through
// a PIXEL-BLOCK dissolve (a grid of tiles pops out one-by-one — see
// `achievementModalIn`). On desktop the card also mouse-tilts in 3D toward the
// cursor (`achievementCardTilt`). When the achievement has no real `image` yet,
// an enlarged placeholder shell stands in.
//
// Sits at z-[60] (above the z-50 navbar). Closes on the backdrop, the ✕ button,
// or Escape — each plays the quick zoom-down before unmounting. Body scroll is
// locked while open (matters on the mobile layout, which scrolls).
// -----------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  achievementModalIn,
  achievementModalOut,
  achievementCardTilt,
} from "@/lib/animations";
import type { Achievement } from "@/lib/achievements";

// Pixel-block dissolve grid over the image (16 × 12 = 192 tiles).
const PIXEL_COLS = 16;
const PIXEL_ROWS = 12;
const PIXEL_TILES = PIXEL_COLS * PIXEL_ROWS;

export function AchievementModal({
  achievement,
  onClose,
}: {
  achievement: Achievement;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Play the close animation, then let the parent unmount us.
  const close = () => achievementModalOut(backdrop.current!, panel.current!, onClose);

  // Entry animation + mouse tilt on mount. A plain effect that KILLS (not
  // reverts) on cleanup: React Strict Mode double-invokes effects in dev, and
  // useGSAP's auto-revert would tear the one-shot entry down and leave it
  // reverted (which is why it looked like nothing animated). kill() just stops
  // the tween, so the re-mounted effect re-applies the from-state and plays.
  useEffect(() => {
    const tiles = root.current!.querySelectorAll("[data-block]");
    const tl = achievementModalIn(backdrop.current!, panel.current!, tiles);
    const stopTilt = achievementCardTilt(panel.current!, root.current!);
    return () => {
      tl.kill();
      stopTilt();
    };
  }, []);

  // Escape to close + lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // close is stable enough for this lifecycle; refs don't change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={`${achievement.title} certificate`}
      // perspective makes the card's 3D mouse-tilt read.
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 [perspective:1200px]"
    >
      {/* Backdrop — click to dismiss. Light + strongly blurred so the pannable
          board clearly shows through (blurred) behind the floating card. */}
      <div
        ref={backdrop}
        onClick={close}
        className="absolute inset-0 bg-black/35 backdrop-blur-xl"
      />

      {/* Panel — a small card floating over the blurred screen. Stop propagation
          so clicks inside don't dismiss. */}
      <div
        ref={panel}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg will-change-transform"
      >
        {/* Certificate image (or enlarged placeholder), with the pixel-block
            dissolve overlay on top. overflow-hidden clips tiles to the rounding. */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black ring-1 ring-white/15">
          {achievement.image ? (
            <Image
              src={achievement.image}
              alt={`${achievement.title} certificate`}
              fill
              sizes="(min-width: 768px) 32rem, 90vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
              <span className="font-mono text-8xl font-semibold tracking-tight text-white/10">
                {achievement.id}
              </span>
              <span aria-hidden className="h-px w-16 bg-blue-500" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">
                Certificate image coming soon
              </span>
            </div>
          )}

          {/* Pixel-block dissolve — tiles start opaque, covering the image, and
              pop out one-by-one on entry (animated in achievementModalIn). */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 grid gap-px bg-black"
            style={{
              gridTemplateColumns: `repeat(${PIXEL_COLS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${PIXEL_ROWS}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: PIXEL_TILES }).map((_, i) => (
              <div key={i} data-block className="bg-zinc-800" />
            ))}
          </div>
        </div>

        {/* Caption row. */}
        <div className="mt-4 flex items-start justify-between gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-blue-400">
              / {achievement.category}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
              {achievement.title}
            </h2>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-400">
              {achievement.issuer}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="shrink-0 rounded-full border border-white/15 px-3 py-1 font-mono text-xs uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:border-white/40 hover:text-white"
          >
            Esc ✕
          </button>
        </div>
      </div>
    </div>
  );
}
