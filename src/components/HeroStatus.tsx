"use client";

// -----------------------------------------------------------------------------
// HeroStatus — right-aligned HUD block for the About hero's empty right side
// -----------------------------------------------------------------------------
// A compact mono readout mirroring the landing page's HUD vocabulary: a live
// local clock, the location/timezone, and an availability line with a pulsing
// "live" dot. The location + availability decode in via ScrambleText (matching
// the nameplate); the pulse respects reduced motion.
// -----------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { ScrambleText } from "@/components/ScrambleText";

/** About-hero HUD. Copy (location, availability, timezone) comes from content/about. */
export function HeroStatus({
  location,
  availability,
  timeZone,
}: {
  location: string;
  availability: string;
  timeZone: string;
}) {
  // null until mounted — the server can't know the client's "now" (avoids a
  // hydration mismatch); a stable placeholder renders first.
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeZone]);

  return (
    <div className="flex flex-col items-end gap-2 text-right font-mono uppercase">
      <span className="text-xs tabular-nums tracking-[0.25em] text-zinc-300">
        {time ?? "--:--:--"}
      </span>
      <ScrambleText
        as="span"
        entrance="observer"
        className="text-[0.625rem] tracking-[0.25em] text-zinc-500"
      >
        {location}
      </ScrambleText>
      <span className="mt-1 flex items-center gap-2 text-[0.625rem] tracking-[0.25em] text-zinc-400">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        <ScrambleText as="span" entrance="observer">
          {availability}
        </ScrambleText>
      </span>
    </div>
  );
}
