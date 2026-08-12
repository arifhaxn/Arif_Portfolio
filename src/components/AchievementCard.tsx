// -----------------------------------------------------------------------------
// AchievementCard
// -----------------------------------------------------------------------------
// One certificate cell. Renders the real certificate <Image> when set, else a
// dark placeholder shell (ghost mono index + a blue accent line), with the title/
// issuer label hidden until the cell is focused.
//
// The focus visual is a WHOLE-CARD zoom (scale-up + a brighter ring + label
// reveal — no brightness glow), driven by the `focused` prop. It lives on THIS
// element (not the parent cell) because the parent cell is what GSAP transforms
// (intro/idle/pan), so the two never fight over the same `transform`.
//
// IMPORTANT: the card is NOT clipped with `overflow-hidden`. Chrome drops a
// border-radius overflow-clip when it composites a *scaled* element, which squares
// off the corners on hover and makes the image look like it's the thing zooming.
// Instead each visible piece rounds ITSELF (image, placeholder, label) — an
// element's own border-radius scales cleanly under a transform, so the corners
// stay round while the whole card zooms.
// -----------------------------------------------------------------------------

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
  return (
    <div
      className={`relative h-full w-full rounded-xl ring-1 transition duration-300 ease-out will-change-transform ${
        focused ? "z-10 scale-[1.12] ring-white/50" : "scale-100 ring-white/10"
      }`}
    >
      {/* --- Visual: real scan when available, else the placeholder shell --- */}
      {achievement.image ? (
        <Image
          src={achievement.image}
          alt={`${achievement.title} certificate`}
          fill
          sizes="(min-width: 1024px) 20rem, 45vw"
          className="rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
          {/* Ghost index — the card's only resting label. */}
          <span className="font-mono text-5xl font-semibold tracking-tight text-white/10">
            {achievement.id}
          </span>
          {/* Blue accent detail, consistent with the site's link/pose accent. */}
          <span aria-hidden className="h-px w-10 bg-blue-500" />
        </div>
      )}

      {/* --- Title / issuer label: revealed on focus (hover desktop / tap mobile).
          rounded-b-xl so its bottom corners match the card now that nothing clips it. */}
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
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">
          {achievement.issuer}
        </p>
      </div>
    </div>
  );
}
