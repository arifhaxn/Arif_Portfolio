"use client";

// -----------------------------------------------------------------------------
// HUD — small ambient corner elements shared by Hero and About
// -----------------------------------------------------------------------------
//   • <LiveStatus> — live local time in the site owner's timezone (Sylhet,
//     Asia/Dhaka) plus a short rotating status phrase. The clock ticks every
//     second; the phrase crossfades on a slow cycle using existing motion
//     tokens (indicatorExit fade, ghostHold hold). Under prefers-reduced-motion
//     the phrase swaps instantly (no fade) — the clock itself is information,
//     not decoration, so it keeps ticking.
//   • <CodingSince> — the bottom-right "YEAR / CODING SINCE" meta.
//     ⚠ PLACEHOLDER: the year renders "20XX" until the site owner provides the
//     real start year — search for CODING_SINCE_YEAR to fix.
//
// Both render as tiny mono uppercase text, consistent with the site's HUD
// typography (nav links, project numbers).
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/animations";
import { DURATION, EASE } from "@/lib/motion";

// ⚠ PLACEHOLDER — real "coding since" year not provided yet. Replace "20XX"
// with the actual year (e.g. "2017") when the site owner confirms it.
const CODING_SINCE_YEAR = "20XX";

const TIME_ZONE = "Asia/Dhaka"; // Sylhet, Bangladesh (GMT+6)
const STATUS_PHRASES = ["BUILDING", "LEARNING", "SHIPPING"];

/** Live HH:MM:SS clock in the owner's timezone + rotating status phrase. */
export function LiveStatus() {
  // null until mounted — the server can't know the client's "now", so we render
  // a stable placeholder first to avoid a hydration mismatch.
  const [time, setTime] = useState<string | null>(null);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const phraseRef = useRef<HTMLSpanElement>(null);

  // Clock: tick every second.
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Status phrase: hold → fade out → swap → fade in, on existing tokens.
  useEffect(() => {
    const el = phraseRef.current;
    const holdMs = (DURATION.ghostHold + DURATION.indicatorExit * 2) * 1000;
    const id = setInterval(() => {
      const next = () => setPhraseIdx((i) => (i + 1) % STATUS_PHRASES.length);
      if (prefersReducedMotion() || !el) {
        next(); // instant swap, no fade
        return;
      }
      gsap.to(el, {
        opacity: 0,
        duration: DURATION.indicatorExit,
        ease: EASE.boot,
        onComplete: () => {
          next();
          gsap.to(el, {
            opacity: 1,
            duration: DURATION.indicatorExit,
            ease: EASE.boot,
          });
        },
      });
    }, holdMs);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
      <span className="tabular-nums">{time ?? "--:--:--"}</span>
      <span>Sylhet / GMT+6</span>
      <span ref={phraseRef} className="text-zinc-300">
        / {STATUS_PHRASES[phraseIdx]}
      </span>
    </div>
  );
}

/** Bottom-right "YEAR / CODING SINCE" meta. Year is a flagged placeholder. */
export function CodingSince() {
  return (
    <div className="text-right font-mono text-[10px] uppercase tracking-[0.2em]">
      <span className="block text-zinc-300">{CODING_SINCE_YEAR}</span>
      <span className="block text-zinc-600">Coding since</span>
    </div>
  );
}
