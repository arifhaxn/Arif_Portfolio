"use client";

// -----------------------------------------------------------------------------
// AchievementModal
// -----------------------------------------------------------------------------
// Full-screen lightbox opened by clicking/tapping a certificate card. The panel
// zooms up and the certificate image "develops" in with a pixelated entry (see
// `achievementModalIn`). When the achievement has no real `image` yet, an
// enlarged placeholder shell stands in — dropping an image path into
// lib/achievements.ts later flips it to the real scan with no change here.
//
// Sits at z-[60] (above the z-50 navbar). Closes on the backdrop, the ✕ button,
// or Escape — each plays the quick zoom-down before unmounting. Body scroll is
// locked while open (matters on the mobile layout, which scrolls).
// -----------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useGSAP } from "@/lib/gsap";
import { achievementModalIn, achievementModalOut } from "@/lib/animations";
import type { Achievement } from "@/lib/achievements";

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
  const imageBox = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      achievementModalIn(backdrop.current!, panel.current!, imageBox.current!);
    },
    { scope: root },
  );

  // Play the close animation, then let the parent unmount us.
  const close = () => achievementModalOut(backdrop.current!, panel.current!, onClose);

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
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
    >
      {/* Backdrop — click to dismiss. */}
      <div
        ref={backdrop}
        onClick={close}
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
      />

      {/* Panel — stop propagation so clicks inside don't dismiss. */}
      <div
        ref={panel}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-3xl"
      >
        {/* Certificate image (or enlarged placeholder). The pixelated entry
            targets this box. `overflow-hidden` clips the clip-path wipe. */}
        <div
          ref={imageBox}
          className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black ring-1 ring-white/15 will-change-[filter,clip-path]"
        >
          {achievement.image ? (
            <Image
              src={achievement.image}
              alt={`${achievement.title} certificate`}
              fill
              sizes="(min-width: 768px) 48rem, 90vw"
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
