// -----------------------------------------------------------------------------
// AchievementCard
// -----------------------------------------------------------------------------
// One certificate cell. Like ThumbnailCard, every entry currently renders the
// placeholder branch: a dark card shell (near-black gradient, ghost mono index,
// a single blue accent line) with the title/issuer label hidden until the cell
// is focused. Set `image` on the achievement in lib/achievements.ts to flip it
// to the real <Image> branch — a data change, not a structural rework.
//
// The focus visual (scale-up + brightness lift + label reveal) is pure CSS on
// THIS element, driven by the `focused` prop. That is deliberate: the parent
// cell wrapper is what GSAP transforms (intro/idle/pan), so keeping the hover
// transform on a separate inner element means the two never fight over the same
// `transform`.
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
      className={`relative h-full w-full overflow-hidden rounded-xl ring-1 transition duration-300 ease-out will-change-transform ${
        focused
          ? "scale-[1.06] ring-white/30 brightness-125"
          : "scale-100 ring-white/10 brightness-90"
      }`}
    >
      {/* --- Visual: real scan when available, else the placeholder shell --- */}
      {achievement.image ? (
        <Image
          src={achievement.image}
          alt={`${achievement.title} certificate`}
          fill
          sizes="(min-width: 1024px) 20rem, 45vw"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
          {/* Ghost index — the card's only resting label. */}
          <span className="font-mono text-5xl font-semibold tracking-tight text-white/10">
            {achievement.id}
          </span>
          {/* Blue accent detail, consistent with the site's link/pose accent. */}
          <span aria-hidden className="h-px w-10 bg-blue-500" />
        </div>
      )}

      {/* --- Title / issuer label: revealed on focus (hover desktop / tap mobile) --- */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-3 pt-8 text-left transition-all duration-300 ${
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
