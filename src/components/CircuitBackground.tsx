// -----------------------------------------------------------------------------
// CircuitBackground
// -----------------------------------------------------------------------------
// A live PCB / neural-net vibe for the project thumbnail: a fixed set of
// circuit-board traces drawn dim, with a bright accent PULSE riding along each
// one. Every trace is pathLength-normalized to 1, so a single shared keyframe
// (circuitFlow, in globals.css) drives them all — independence comes from a
// per-trace animation-duration + delay, so the pulses never march in lockstep.
//
// Color: the whole SVG inherits `color` from the accent, and every stroke uses
// currentColor. Geometry variety per card: `variant` flips the trace group
// across the card's center (4 orientations) and offsets the pulse phase, so the
// six cards don't read as identical boards. The center is masked out (in
// ThumbnailCard) so the logo stays clean on top.
// -----------------------------------------------------------------------------

// Curated traces (viewBox 400×160). Manhattan runs with 45° elbows ending in
// pads — routed to leave the middle open for the logo.
const TRACES = [
  "M0 18 H70 l20 20 H150",
  "M0 46 H50 l18 -18 H130",
  "M0 70 H100 l16 16 H150",
  "M0 96 H60 l20 -20 H140",
  "M0 120 H90 l18 18 H150",
  "M0 142 H40 l20 -20 H120",
  "M400 22 H330 l-20 20 H250",
  "M400 50 H350 l-18 -18 H270",
  "M400 74 H300 l-16 16 H250",
  "M400 100 H340 l-20 -20 H260",
  "M400 126 H310 l-18 18 H250",
  "M400 146 H360 l-20 -20 H280",
  "M30 0 V40 l20 20 V90",
  "M370 0 V44 l-20 20 V96",
  "M120 160 V126 l20 -20 H150",
  "M280 160 V130 l-20 -20 H250",
] as const;

// Pads at the inner trace endpoints; a subset (pulse) softly blinks.
const NODES: { x: number; y: number; pulse?: boolean }[] = [
  { x: 150, y: 38, pulse: true },
  { x: 130, y: 28 },
  { x: 150, y: 86 },
  { x: 140, y: 76, pulse: true },
  { x: 150, y: 138 },
  { x: 120, y: 122, pulse: true },
  { x: 250, y: 42 },
  { x: 270, y: 32, pulse: true },
  { x: 250, y: 90 },
  { x: 260, y: 80 },
  { x: 250, y: 144, pulse: true },
  { x: 280, y: 126 },
  { x: 50, y: 90 },
  { x: 350, y: 96, pulse: true },
  { x: 150, y: 106 },
  { x: 250, y: 110 },
];

export function CircuitBackground({
  accent = "#3b82f6",
  variant = 0,
}: {
  accent?: string;
  variant?: number;
}) {
  // 4 distinct orientations from the variant, flipped about the card center.
  const sx = variant % 2 === 0 ? 1 : -1;
  const sy = variant % 4 < 2 ? 1 : -1;
  const phase = (variant % 6) * 0.31; // seconds — shifts this board's pulses

  return (
    <svg
      aria-hidden
      viewBox="0 0 400 160"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      style={{ color: accent }}
    >
      <g transform={`translate(200 80) scale(${sx} ${sy}) translate(-200 -80)`}>
        {/* Dim static board. */}
        <g fill="none" stroke="currentColor" strokeOpacity={0.16} strokeWidth={1}>
          {TRACES.map((d, i) => (
            <path key={`b${i}`} d={d} />
          ))}
        </g>

        {/* Travelling pulses — one per trace, each its own tempo. */}
        <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
          {TRACES.map((d, i) => (
            <path
              key={`f${i}`}
              d={d}
              pathLength={1}
              className="circuit-flow"
              style={{
                animationDuration: `${2.6 + (i % 5) * 0.6}s`,
                animationDelay: `${(((i * 0.53) % 3) + phase).toFixed(2)}s`,
              }}
            />
          ))}
        </g>

        {/* Junction pads. */}
        <g fill="currentColor">
          {NODES.map((n, i) => (
            <circle
              key={`n${i}`}
              cx={n.x}
              cy={n.y}
              r={2}
              opacity={n.pulse ? undefined : 0.35}
              className={n.pulse ? "circuit-node" : undefined}
              style={
                n.pulse
                  ? {
                      animationDuration: `${2.2 + (i % 4) * 0.5}s`,
                      animationDelay: `${((i * 0.4) % 2).toFixed(2)}s`,
                    }
                  : undefined
              }
            />
          ))}
        </g>
      </g>
    </svg>
  );
}
