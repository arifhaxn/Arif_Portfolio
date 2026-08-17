"use client";

// -----------------------------------------------------------------------------
// AchievementsView — /achievements page body (client)
// -----------------------------------------------------------------------------
// The full pannable certificate board (desktop) / stacked sections (mobile). All
// DATA/COPY (eyebrow, heading, subtitle, category order, certificate items) is
// passed in from the server page (content/achievements in Firestore); the pan /
// warp / intro / stat-readout behavior is unchanged.
//
// Desktop (lg+): a FULL-BLEED board of labelled certificate sections the user
//   freely PANS via GSAP Observer (inertia, rubber-band, converge-with-speed).
//   Cells pixel-sweep in on mount + carry a subtle idle ripple; hover reveals the
//   label. Bottom-left HUD label, bottom-right live stat readout, no top header.
// Mobile (<lg): pan/warp dropped; sections stack, cards reveal on scroll.
//
// The stat readout is REAL: ELAPSED ticks from mount; SWITCHES counts focus
// changes. (Those live-stat field labels stay in code — they're structural, not
// editable page copy.)
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import dynamic from "next/dynamic";
import { gsap, useGSAP } from "@/lib/gsap";
import {
  achievementsGridIntro,
  achievementsIdleWarp,
  achievementsPanWarp,
  scrollReveal,
} from "@/lib/animations";
import { ACHIEVE } from "@/lib/motion";
import { groupByCategory, type Achievement } from "@/lib/achievements";
import { AchievementCard } from "@/components/AchievementCard";
import { AchievementModal } from "@/components/AchievementModal";
import { ScrambleText } from "@/components/ScrambleText";
import type { AchievementsContent } from "@/lib/content-types";

// Ambient space-time-fabric backdrop behind the certificate board. Client-only (WebGL).
const SpaceTimeFabric = dynamic(
  () => import("@/components/SpaceTimeFabric").then((m) => m.SpaceTimeFabric),
  { ssr: false },
);

// Card geometry — kept at the original compact size/spacing. All sections use
// the same column count so their grids left-align to a consistent width; stacked
// vertically, the whole board is larger than the viewport (that overflow is the
// pan range).
const COLS = 4;
const CARD_W = 300; // fixed column WIDTH; each card's height follows its scan
// …expressed in rem so the column rides the large-display UI scale (globals.css /
// lib/uiScale) like the rest of the board. As raw px the cards stayed 300 wide on
// a big monitor while the type inside them grew, and the focus label — sized in
// rem — started wrapping to three lines inside a card that never got any wider.
const CARD_W_CSS = `${CARD_W / 16}rem`;

export function AchievementsView({ content }: { content: AchievementsContent }) {
  const root = useRef<HTMLElement>(null);
  const panViewport = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);

  const GROUPS = groupByCategory(content.items, content.categoryOrder);

  // --- Live stat readout (all real) ---
  const [elapsed, setElapsed] = useState(0); // seconds since mount
  const [switches, setSwitches] = useState(0); // focused-cell changes
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const focusedRef = useRef<string | null>(null);

  // Clicked certificate → opens the zoom modal (null = closed).
  const [selected, setSelected] = useState<Achievement | null>(null);
  // Pointer-down position, to tell a click (open modal) from a drag (pan).
  const downPos = useRef<{ x: number; y: number } | null>(null);
  const openIfClick = (a: Achievement, e: ReactPointerEvent) => {
    const d = downPos.current;
    downPos.current = null;
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) setSelected(a);
  };

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

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // ---- Desktop: pixel intro + idle warp + pan/converge ----
      mm.add("(min-width: 1024px)", () => {
        const cells = gsap.utils.toArray<HTMLElement>(
          "[data-cell]",
          grid.current,
        );

        // Center the pannable board, then let the pan helper drive x/y/scale.
        gsap.set(grid.current, { xPercent: -50, yPercent: -50 });

        achievementsGridIntro(cells);
        const idle = achievementsIdleWarp(cells);

        // Bounds recomputed live so panning tracks window resizes. Board is
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
          .forEach((card) => scrollReveal(card, { y: 24 }, "top 90%"));
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(
    elapsed % 60,
  ).padStart(2, "0")}`;
  const certCount = String(content.items.length).padStart(3, "0");
  const switchCount = String(switches).padStart(3, "0");

  return (
    <main
      ref={root}
      className="relative min-h-screen bg-black text-white lg:h-screen lg:overflow-hidden"
    >
      {/* Ambient space-time-fabric backdrop, fixed behind the pannable board
          (the cards pan over it). Desktop only, dimmed so it doesn't fight the
          cards; tier-gated + off-screen-paused inside the component. */}
      <div className="pointer-events-none absolute inset-0 z-0 hidden opacity-55 lg:block">
        <SpaceTimeFabric />
      </div>

      {/* ===================== Desktop: pannable section board ============== */}
      <div
        ref={panViewport}
        // select-none: dragging to pan must not also select/highlight card text.
        className="absolute inset-0 z-10 hidden cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing lg:block"
      >
        <div ref={grid} className="absolute left-1/2 top-1/2 will-change-transform">
          {/* pt-16 reserves clear space above the first section so that when the
              board opens at its top, the Hackathons label sits below the fixed
              60px navbar instead of behind it. */}
          <div className="flex flex-col gap-20 pt-16">
            {GROUPS.map(({ category, items }) => (
              <section key={category} className="flex flex-col gap-5">
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.25em] text-zinc-500">
                  <span className="text-zinc-300">/ {category}</span>
                  <span className="ml-3 text-zinc-600">
                    {String(items.length).padStart(2, "0")}
                  </span>
                </p>
                <div
                  className="grid items-start gap-x-24 gap-y-24"
                  style={{ gridTemplateColumns: `repeat(${COLS}, ${CARD_W_CSS})` }}
                >
                  {items.map((a) => {
                    // Focus identity must be globally unique: certificate ids
                    // restart per category (01, 02, … in each section), so keying
                    // focus on `a.id` alone lights up the same-index card in every
                    // section — i.e. the whole column. Scope it by category.
                    const cellKey = `${category}::${a.id}`;
                    return (
                      <div
                        key={cellKey}
                        data-cell
                        style={{ width: CARD_W_CSS }}
                        className="will-change-transform"
                        onMouseEnter={() => focus(cellKey)}
                        onMouseLeave={() => focus(null)}
                        onPointerDown={(e) => {
                          downPos.current = { x: e.clientX, y: e.clientY };
                        }}
                        onPointerUp={(e) => openIfClick(a, e)}
                      >
                        <AchievementCard
                          achievement={a}
                          focused={focusedId === cellKey}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      {/* --- Desktop HUD corners (over the board), same look as Hud.tsx.
          pointer-events-none so they never intercept a drag/wheel on the grid. */}
      {/* Bottom-left: section label. */}
      <div className="pointer-events-none absolute bottom-8 left-6 z-20 hidden sm:left-10 lg:block">
        <ScrambleText
          as="h1"
          entrance="observer"
          className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-white"
        >
          {content.eyebrow}
        </ScrambleText>
        <p className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-zinc-500">
          {content.subtitle}
        </p>
      </div>
      {/* Bottom-right: live stat readout (3-line, label + value). */}
      <div className="pointer-events-none absolute bottom-8 right-6 z-20 hidden font-mono text-[0.625rem] uppercase tracking-[0.2em] sm:right-10 lg:block">
        <div className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1">
          <span className="text-zinc-600">Certificates</span>
          <span className="text-right tabular-nums text-zinc-300">{certCount}</span>
          <span className="text-zinc-600">Elapsed</span>
          <span className="text-right tabular-nums text-zinc-300">{mmss}</span>
          <span className="text-zinc-600">Switches</span>
          <span className="text-right tabular-nums text-zinc-300">{switchCount}</span>
        </div>
      </div>

      {/* ==================== Mobile: stacked sections ===================== */}
      {/* pt is notch-safe (safe-area inset) so the eyebrow clears the fixed nav
          with room to breathe. */}
      <div className="px-6 pb-24 pt-[calc(7rem+env(safe-area-inset-top))] lg:hidden">
        <ScrambleText
          as="p"
          entrance="observer"
          className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500"
        >
          {content.eyebrow}
        </ScrambleText>
        <ScrambleText
          as="h1"
          entrance="observer"
          className="mt-3 text-4xl font-semibold tracking-tight"
        >
          {content.heading}
        </ScrambleText>
        <p className="mt-3 text-sm text-zinc-400">{content.subtitle}</p>
        {/* Stat readout — each stat is one intact flex item so a narrow screen
            wraps BETWEEN stats, never splitting a label from its value (the old
            single line broke as "SWITCHES / 000"). */}
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-white/5 pt-5 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-zinc-500">
          <span>
            Certificates <span className="tabular-nums text-zinc-300">{certCount}</span>
          </span>
          <span>
            Elapsed <span className="tabular-nums text-zinc-300">{mmss}</span>
          </span>
          <span>
            Switches <span className="tabular-nums text-zinc-300">{switchCount}</span>
          </span>
        </div>

        {GROUPS.map(({ category, items }) => (
          <section key={category} className="mt-12">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.25em] text-zinc-500">
              <span className="text-zinc-300">/ {category}</span>
              <span className="ml-3 text-zinc-600">
                {String(items.length).padStart(2, "0")}
              </span>
            </p>
            <div className="mt-4 grid grid-cols-2 items-start gap-4">
              {items.map((a) => (
                <div
                  key={`${category}::${a.id}`}
                  data-mobile-card
                  onClick={() => setSelected(a)}
                >
                  <AchievementCard
                    achievement={a}
                    focused={focusedId === `${category}::${a.id}`}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Click-to-zoom certificate lightbox (pixelated entry). */}
      {selected && (
        <AchievementModal
          achievement={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
