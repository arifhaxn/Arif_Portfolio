"use client";

// -----------------------------------------------------------------------------
// /achievements — certificates & credentials
// -----------------------------------------------------------------------------
// Dedicated route (Navbar lives in the root layout, so it persists here). The
// page has two layouts, the site's established desktop-rich / mobile-simple split:
//
// Desktop (lg+): a bounded certificate grid, larger than the viewport in both
//   directions, that the user freely PANS (wheel / trackpad / drag) via GSAP
//   Observer. The grid glides with inertia, rubber-bands at its edges, and shears
//   slightly along the pan velocity (a rubber-sheet warp). Cells punch in on
//   mount and carry a continuous low-amplitude idle ripple. Hovering a cell lifts
//   it and reveals its label. All the motion lives in the achievements* helpers.
//
// Mobile (<lg): the pan/warp is dropped entirely (touch + expense). A plain
//   2-column grid reveals card-by-card via the shared `scrollReveal` as the page
//   scrolls normally.
//
// The header stat readout is REAL, not decoration: ELAPSED ticks from mount and
// SWITCHES counts every time the focused cell actually changes.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import {
  achievementsGridIntro,
  achievementsIdleWarp,
  achievementsPanWarp,
  scrollReveal,
} from "@/lib/animations";
import { ACHIEVE } from "@/lib/motion";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { AchievementCard } from "@/components/AchievementCard";

// Desktop grid geometry. Chosen so the whole grid (4 cols × 3 rows of these
// cards + gaps ≈ 1488×900) is larger than a typical viewport in both directions,
// so it clearly extends past all four edges at rest and needs panning to explore.
const COLS = 4;
const CARD_W = 300;
const CARD_H = 220;
const GAP_X = 96;
const GAP_Y = 120;

export default function AchievementsPage() {
  const root = useRef<HTMLElement>(null);
  const panViewport = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);

  // --- Live stat readout (all real) ---
  const [elapsed, setElapsed] = useState(0); // seconds since mount
  const [switches, setSwitches] = useState(0); // focused-cell changes
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const focusedRef = useRef<string | null>(null);

  // ELAPSED — tick once a second from mount (mirrors Hud.tsx's live clock idea).
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // SWITCHES — increment only when focus moves to a genuinely different cell.
  const focus = (id: string | null) => {
    if (id !== null && id !== focusedRef.current) setSwitches((n) => n + 1);
    focusedRef.current = id;
    setFocusedId(id);
  };
  // Mobile tap toggles focus for the tapped card.
  const toggle = (id: string) => focus(focusedRef.current === id ? null : id);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // ---- Desktop: intro + idle warp + pan/warp ----
      mm.add("(min-width: 1024px)", () => {
        const cells = gsap.utils.toArray<HTMLElement>(
          "[data-cell]",
          grid.current,
        );

        // Center the pannable grid, then let the pan helper drive x/y/skew.
        gsap.set(grid.current, { xPercent: -50, yPercent: -50 });

        achievementsGridIntro(cells);
        const idle = achievementsIdleWarp(cells);

        // Bounds recomputed live so panning tracks window resizes. Grid is
        // centered, so each axis allows ± half the overflow (+ a little slack).
        const getBounds = () => {
          const g = grid.current;
          if (!g) return { maxX: 0, maxY: 0 };
          return {
            maxX: Math.max(0, (g.offsetWidth - window.innerWidth) / 2 + ACHIEVE.edgePad),
            maxY: Math.max(0, (g.offsetHeight - window.innerHeight) / 2 + ACHIEVE.edgePad),
          };
        };

        const stopPan =
          panViewport.current && grid.current
            ? achievementsPanWarp(panViewport.current, grid.current, getBounds)
            : () => {};

        return () => {
          idle.kill();
          stopPan();
        };
      });

      // ---- Mobile: plain scroll reveals, no pan ----
      mm.add("(max-width: 1023px)", () => {
        gsap.utils
          .toArray<HTMLElement>("[data-mobile-card]", root.current)
          .forEach((card) => scrollReveal(card, { y: 24 }, "top 88%"));
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(
    elapsed % 60,
  ).padStart(2, "0")}`;
  const statLine = `CERTIFICATES ${String(ACHIEVEMENTS.length).padStart(
    2,
    "0",
  )} · ELAPSED ${mmss} · SWITCHES ${String(switches).padStart(3, "0")}`;

  return (
    <main ref={root} className="relative min-h-screen bg-black text-white">
      {/* ================= Header + live stat readout (shared) ============== */}
      {/* Fixed on desktop so it floats over the pan pane; the mobile layout
          re-renders its own in-flow header below. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 hidden px-6 pt-24 sm:px-10 lg:block">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
          / Achievements
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          Achievements
        </h1>
        <p className="mt-1 text-sm text-zinc-400">— Certificates &amp; credentials</p>
      </div>
      {/* Stat readout — same mono/HUD treatment as Hud.tsx, pinned bottom-left. */}
      <div className="pointer-events-none fixed bottom-8 left-6 z-20 hidden font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500 sm:left-10 lg:block">
        <span className="tabular-nums text-zinc-300">{statLine}</span>
      </div>
      {/* Drag hint, bottom-right. */}
      <div className="pointer-events-none fixed bottom-8 right-6 z-20 hidden font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 sm:right-10 lg:block">
        Drag / scroll to explore
      </div>

      {/* ===================== Desktop: pannable warp grid ================== */}
      <div
        ref={panViewport}
        className="fixed inset-0 z-0 hidden cursor-grab touch-none overflow-hidden active:cursor-grabbing lg:block"
      >
        <div ref={grid} className="absolute left-1/2 top-1/2 will-change-transform">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${COLS}, ${CARD_W}px)`,
              columnGap: `${GAP_X}px`,
              rowGap: `${GAP_Y}px`,
            }}
          >
            {ACHIEVEMENTS.map((a) => (
              <div
                key={a.id}
                data-cell
                style={{ width: CARD_W, height: CARD_H }}
                className="will-change-transform"
                onMouseEnter={() => focus(a.id)}
                onMouseLeave={() => focus(null)}
              >
                <AchievementCard achievement={a} focused={focusedId === a.id} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================= Mobile: simple grid ===================== */}
      <div className="px-6 pb-24 pt-28 lg:hidden">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
          / Achievements
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Achievements</h1>
        <p className="mt-1 text-sm text-zinc-400">— Certificates &amp; credentials</p>
        {/* Stat readout (mobile: in-flow, SWITCHES driven by taps). */}
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          <span className="tabular-nums text-zinc-300">{statLine}</span>
        </p>

        <div className="mt-10 grid grid-cols-2 gap-4">
          {ACHIEVEMENTS.map((a) => (
            <div
              key={a.id}
              data-mobile-card
              className="h-44"
              onClick={() => toggle(a.id)}
            >
              <AchievementCard achievement={a} focused={focusedId === a.id} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
