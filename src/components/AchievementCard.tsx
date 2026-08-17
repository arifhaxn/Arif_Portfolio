"use client";

// -----------------------------------------------------------------------------
// AchievementCard
// -----------------------------------------------------------------------------
// One certificate cell. The card TAKES THE CERTIFICATE'S OWN ASPECT RATIO (read
// from the image once it loads) so the scan fills it edge-to-edge with no crop
// and no letterbox — the card is the shape of the certificate. Until the image
// loads (and for the no-image placeholder) it falls back to a 4:3 default. Cells
// are all the same WIDTH (the grid column) but their height varies with each
// certificate, so rows are intentionally ragged.
//
// The focus visual is a WHOLE-CARD zoom (scale-up + brighter ring + label
// reveal), driven by `focused`. It lives on THIS element (not the parent cell)
// because the parent cell is what GSAP transforms (intro/idle/pan), so the two
// never fight over the same `transform`.
//
// The card is NOT clipped with `overflow-hidden` (Chrome drops a border-radius
// overflow-clip when it composites a scaled element, squaring the corners on
// hover). Each visible piece rounds ITSELF instead.
// -----------------------------------------------------------------------------

import { useState } from "react";
import Image from "next/image";
import type { Achievement } from "@/lib/achievements";
import { ScrambleText } from "@/components/ScrambleText";

export function AchievementCard({
  achievement,
  focused = false,
}: {
  achievement: Achievement;
  focused?: boolean;
}) {
  // The card's aspect ratio = the certificate's, resolved from the loaded image.
  const [aspect, setAspect] = useState(4 / 3);

  return (
    <div
      style={{ aspectRatio: achievement.image ? aspect : 4 / 3 }}
      className={`relative w-full rounded-xl bg-zinc-950 ring-1 transition duration-300 ease-out will-change-transform ${
        focused ? "z-10 scale-[1.12] ring-white/50" : "scale-100 ring-white/10"
      }`}
    >
      {/* Real scan when available, else the placeholder shell. object-cover fills
          exactly because the card now matches the scan's aspect (no crop). */}
      {achievement.image ? (
        <Image
          src={achievement.image}
          alt={`${achievement.title} certificate`}
          fill
          sizes="(min-width: 1024px) 20rem, 45vw"
          className="rounded-xl object-cover"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              setAspect(img.naturalWidth / img.naturalHeight);
            }
          }}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
          <span className="font-mono text-5xl font-semibold tracking-tight text-white/10">
            {achievement.id}
          </span>
          <span aria-hidden className="h-px w-10 bg-blue-500" />
        </div>
      )}

      {/* Title / issuer label: revealed on focus. */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col gap-0.5 rounded-b-xl bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-3 pt-8 text-left transition-all duration-300 ${
          focused ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <ScrambleText
          as="p"
          entrance="observer"
          className="text-sm font-medium text-white"
        >
          {achievement.title}
        </ScrambleText>
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-zinc-400">
          {achievement.issuer}
        </p>
      </div>
    </div>
  );
}
