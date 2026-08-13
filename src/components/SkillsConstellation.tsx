"use client";

// -----------------------------------------------------------------------------
// SkillsConstellation — the About page's skills section as a living tech graph
// -----------------------------------------------------------------------------
// Replaces the flat two-column skill list with a canvas "neural / circuit"
// graph that reuses the site's established motion language: a central ARIF core
// wires out to one blue hub per category, each branching to its individual
// skills; bright pulses travel the links (like the project-card circuit traces),
// the whole field drifts and repels the cursor (like the robot's particle
// field), and moving the cursor NEAR a link lights up its cluster.
//
// Behaviors:
//   • Grow-in reveal — on first scroll into view the nodes spring OUT of the
//     core along their links, then idle-drift.
//   • Proximity trace — the link nearest the cursor (and its whole cluster) turns
//     blue; a corner HUD names it. On touch / no fine pointer, it AUTO-cycles the
//     clusters so the effect still reads without a cursor.
//   • Cursor repulsion — nodes near the cursor are pushed away.
//   • Off-screen the render loop fully stops (IntersectionObserver), matching
//     HeroHead's frameloop pause — no idle CPU when scrolled away.
//   • The whole graph is auto-fit inside the canvas (with label padding) so no
//     node or label is ever clipped, whatever the data or viewport.
//
// Adaptive / accessible:
//   • Device tier (see lib/quality), prefers-reduced-motion, or a phone-width
//     screen → render the ORIGINAL clean text grid instead (no canvas, no loop).
//     Same responsive/adaptive degradation the 3D and circuit backgrounds use.
//   • A visually-hidden list mirrors every skill for screen readers + SEO; the
//     canvas itself is aria-hidden decoration.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/animations";
import { detectQualityTier, type QualityTier } from "@/lib/quality";
import { ScrambleText } from "@/components/ScrambleText";

type SkillGroup = { label: string; items: string[] };

const BLUE = "#3b82f6";
const TAU = Math.PI * 2;

// -----------------------------------------------------------------------------
// The canvas graph (only mounted on capable, wide-enough devices, motion on).
// -----------------------------------------------------------------------------
type Node = {
  type: "core" | "hub" | "leaf";
  label: string;
  cat: number; // -1 for the core
  rx: number; // raw layout x (pre-fit, origin-centered)
  ry: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hx: number; // fitted home x
  hy: number;
  ph: number; // drift phase
  r: number; // base radius
};
type Link = { a: Node; b: Node; pulse: number; speed: number };

/** Shortest distance from point (px,py) to the segment a→b. */
function distToSeg(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return Math.sqrt(ex * ex + ey * ey);
}

function SkillGraphCanvas({ skills }: { skills: SkillGroup[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const totalSkills = useMemo(
    () => skills.reduce((n, c) => n + c.items.length, 0),
    [skills],
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match the page's own type (Geist), resolved from the canvas's inherited
    // font-family, so labels read as part of the site instead of a generic mono.
    const fontFamily =
      getComputedStyle(canvas).fontFamily || "system-ui, sans-serif";

    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;

    let W = 0;
    let H = 0;
    let raf = 0;
    let running = false;
    let revealed = false;
    let reveal = 0; // 0→1 grow-in progress
    let t = 0;
    let now = 0; // accumulated ms (frame-derived; no Date.now)

    const nodes: Node[] = [];
    const links: Link[] = [];
    const core: Node = {
      type: "core",
      label: "ARIF",
      cat: -1,
      rx: 0,
      ry: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      hx: 0,
      hy: 0,
      ph: 0,
      r: 6,
    };
    const mouse = { x: -1e4, y: -1e4, active: false };

    const build = (grow: boolean) => {
      nodes.length = 0;
      links.length = 0;
      nodes.push(core);

      // Raw layout in origin-centered units; the fit pass below scales it into the
      // canvas, so these are just proportions (hub ring radius vs. leaf reach).
      const RING = 200;
      skills.forEach((c, i) => {
        const a = (i / skills.length) * TAU - Math.PI / 2;
        const hrx = Math.cos(a) * RING;
        const hry = Math.sin(a) * RING;
        const hub: Node = {
          type: "hub",
          label: c.label,
          cat: i,
          rx: hrx,
          ry: hry,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          hx: 0,
          hy: 0,
          ph: (i * 1.7) % TAU,
          r: 5,
        };
        nodes.push(hub);
        links.push({ a: core, b: hub, pulse: (i * 0.37) % 1, speed: 0.16 });
        const n = c.items.length;
        const leafR = 96 + n * 14;
        c.items.forEach((s, j) => {
          const la = a + (j - (n - 1) / 2) * (1.2 / Math.max(n, 2));
          const leaf: Node = {
            type: "leaf",
            label: s,
            cat: i,
            rx: hrx + Math.cos(la) * leafR,
            ry: hry + Math.sin(la) * leafR,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            hx: 0,
            hy: 0,
            ph: (i * 3 + j) % TAU,
            r: 3,
          };
          nodes.push(leaf);
          links.push({
            a: hub,
            b: leaf,
            pulse: ((i * 2 + j) * 0.19) % 1,
            speed: 0.3 + (j % 3) * 0.08,
          });
        });
      });

      // Auto-fit: scale + center the raw layout into the canvas, leaving margins
      // for labels (wider on the sides where skill names sit, shorter top/bottom).
      const padX = W < 820 ? 78 : 116;
      const padTop = 40;
      const padBottom = 54;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const nd of nodes) {
        if (nd.rx < minX) minX = nd.rx;
        if (nd.rx > maxX) maxX = nd.rx;
        if (nd.ry < minY) minY = nd.ry;
        if (nd.ry > maxY) maxY = nd.ry;
      }
      const availW = W - 2 * padX;
      const availH = H - padTop - padBottom;
      const s = Math.min(
        availW / (maxX - minX || 1),
        availH / (maxY - minY || 1),
      );
      const offX = padX + (availW - (maxX - minX) * s) / 2 - minX * s;
      const offY = padTop + (availH - (maxY - minY) * s) / 2 - minY * s;
      for (const nd of nodes) {
        nd.hx = nd.rx * s + offX;
        nd.hy = nd.ry * s + offY;
      }
      for (const nd of nodes) {
        if (grow && nd.type !== "core") {
          nd.x = core.hx;
          nd.y = core.hy;
        } else {
          nd.x = nd.hx;
          nd.y = nd.hy;
        }
        nd.vx = 0;
        nd.vy = 0;
      }
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, rect.width);
      H = W >= 1024 ? 600 : 540;
      canvas.style.height = `${H}px`;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build(!revealed);
    };

    const pad = 14;
    const clamp = (v: number, lo: number, hi: number) =>
      v < lo ? lo : v > hi ? hi : v;

    const EDGE_HIT = 48; // px: cursor-to-link distance that lights a cluster
    let lastActive = -1;

    const draw = (dt: number) => {
      t += dt;
      now += dt * 1000;
      if (!revealed) reveal = 0;
      else if (reveal < 1) reveal = Math.min(1, reveal + dt * 1.1);
      const ease = reveal * reveal * (3 - 2 * reveal); // smoothstep

      ctx.clearRect(0, 0, W, H);

      // physics: drift toward home + cursor repel, clamped to the canvas
      for (const nd of nodes) {
        if (nd.type === "core") continue;
        const tx = nd.hx + Math.cos(t * 0.5 + nd.ph) * 4 * ease;
        const ty = nd.hy + Math.sin(t * 0.45 + nd.ph) * 4 * ease;
        nd.vx += (tx - nd.x) * 0.02;
        nd.vy += (ty - nd.y) * 0.02;
        if (mouse.active) {
          const dx = nd.x - mouse.x;
          const dy = nd.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          const R = 110;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / R) * 3.2;
            nd.vx += (dx / d) * f;
            nd.vy += (dy / d) * f;
          }
        }
        nd.vx *= 0.86;
        nd.vy *= 0.86;
        nd.x = clamp(nd.x + nd.vx, pad, W - pad);
        nd.y = clamp(nd.y + nd.vy, pad, H - pad);
      }

      // active cluster — from the LINK nearest the cursor, or auto-cycled on touch
      let activeCat: number | null = null;
      if (mouse.active && finePointer && reveal > 0.4) {
        let minD = EDGE_HIT;
        for (const l of links) {
          const d = distToSeg(mouse.x, mouse.y, l.a.x, l.a.y, l.b.x, l.b.y);
          if (d < minD) {
            minD = d;
            activeCat = l.b.cat;
          }
        }
      } else if (!finePointer && reveal > 0.6) {
        activeCat = Math.floor(now / 1900) % skills.length;
      }

      // links + travelling pulses
      for (const l of links) {
        const on =
          activeCat != null &&
          (l.b.cat === activeCat ||
            (l.a.type === "core" && l.b.cat === activeCat));
        ctx.strokeStyle = on
          ? "rgba(59,130,246,0.6)"
          : `rgba(96,110,140,${0.16 * reveal})`;
        ctx.lineWidth = on ? 1.6 : 1;
        ctx.beginPath();
        ctx.moveTo(l.a.x, l.a.y);
        ctx.lineTo(l.b.x, l.b.y);
        ctx.stroke();
        if (reveal > 0.5) {
          l.pulse += l.speed * dt;
          if (l.pulse > 1) l.pulse -= 1;
          const px = l.a.x + (l.b.x - l.a.x) * l.pulse;
          const py = l.a.y + (l.b.y - l.a.y) * l.pulse;
          ctx.fillStyle = on ? "rgba(147,197,253,0.95)" : "rgba(59,130,246,0.5)";
          ctx.beginPath();
          ctx.arc(px, py, on ? 2.6 : 1.6, 0, TAU);
          ctx.fill();
        }
      }

      // core pulse ring (echoes the career "present" node)
      const pulseR = core.r + 6 + Math.sin(t * 1.6) * 3;
      ctx.strokeStyle = `rgba(59,130,246,${0.25 + 0.15 * Math.sin(t * 1.6)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(core.x, core.y, pulseR, 0, TAU);
      ctx.stroke();

      // nodes + labels
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (const nd of nodes) {
        const isActive = activeCat != null && nd.cat === activeCat;
        let col: string;
        let lab: string;
        let labCol: string;
        let size: number;
        if (nd.type === "core") {
          col = "#f4f4f5";
          lab = nd.label;
          labCol = "#d4d4d8";
          size = 13;
        } else if (nd.type === "hub") {
          col = BLUE;
          lab = nd.label.toUpperCase();
          labCol = isActive ? "#dbeafe" : "#a1a1aa";
          size = 12;
        } else {
          col = isActive ? "#ffffff" : "#d4d4d8";
          lab = nd.label;
          labCol = isActive ? "#ffffff" : "#a1a1aa";
          size = 15;
        }

        // highlight halo on the active cluster
        if (isActive) {
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, nd.r + 7, 0, TAU);
          ctx.fillStyle =
            nd.type === "leaf"
              ? "rgba(255,255,255,0.10)"
              : "rgba(59,130,246,0.16)";
          ctx.fill();
        }

        ctx.globalAlpha = nd.type === "core" ? 1 : reveal;
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, nd.r, 0, TAU);
        ctx.fillStyle = col;
        ctx.fill();
        if (nd.type !== "leaf") {
          ctx.strokeStyle = "rgba(59,130,246,0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, nd.r + 3, 0, TAU);
          ctx.stroke();
        }

        // labels — the site's font, bold, offset BELOW the dot (incl. the core,
        // so "ARIF" no longer overlaps its own node).
        ctx.font = `700 ${size}px ${fontFamily}`;
        ctx.fillStyle = labCol;
        ctx.fillText(lab, nd.x, nd.y + nd.r + 7);
        ctx.globalAlpha = 1;
      }

      if (activeCat !== lastActive) {
        lastActive = activeCat ?? -1;
        setActiveLabel(activeCat != null ? skills[activeCat].label : null);
      }
    };

    let prev = 0;
    const loop = (ts: number) => {
      const dt = prev ? Math.min(0.05, (ts - prev) / 1000) : 0.016;
      prev = ts;
      draw(dt);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      prev = 0;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.active = true;
    };
    const onLeave = () => {
      mouse.active = false;
      mouse.x = mouse.y = -1e4;
    };
    if (finePointer) {
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", onLeave);
    }

    // Off-screen → stop the loop entirely (no idle CPU). First entry starts the
    // grow-in reveal.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!revealed) revealed = true;
          start();
        } else {
          stop();
        }
      },
      { threshold: 0.06 },
    );
    io.observe(wrap);

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [skills]);

  return (
    <div ref={wrapRef} aria-hidden className="relative">
      {/* corner HUD readouts — the site's mono/blue chrome, no containing box */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-600">
        move cursor near a link to trace
      </div>
      <div className="pointer-events-none absolute right-0 top-0 z-10 text-right font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-600">
        {activeLabel ? (
          <span className="text-blue-400">› {activeLabel}</span>
        ) : (
          <span>
            {skills.length} clusters · {totalSkills} nodes
          </span>
        )}
      </div>
      <canvas ref={canvasRef} className="block w-full" />
    </div>
  );
}

// -----------------------------------------------------------------------------
// The original clean text grid — the low-tier / reduced-motion / phone fallback.
// -----------------------------------------------------------------------------
function SkillsTextGrid({ skills }: { skills: SkillGroup[] }) {
  return (
    <div className="grid gap-x-12 gap-y-16 sm:grid-cols-2">
      {skills.map((cat, i) => (
        <div key={cat.label} data-skill className="flex flex-col gap-3">
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
            {String(i + 1).padStart(2, "0")} — {cat.label}
          </h3>
          <ScrambleText
            as="p"
            entrance="observer"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {cat.items.join(" · ")}
          </ScrambleText>
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Section wrapper: eyebrow + graph (capable devices) or text grid (fallback).
// -----------------------------------------------------------------------------
export function SkillsConstellation({
  skills,
  eyebrow,
}: {
  skills: SkillGroup[];
  eyebrow: string;
}) {
  // Resolve the tier on the client (needs navigator + a WebGL probe). Until then,
  // and on the low tier / reduced motion, render the plain grid — that keeps SSR
  // and first paint identical to the fallback (no hydration mismatch) and gives
  // weak hardware the calm version.
  const [tier, setTier] = useState<QualityTier | null>(null);
  const reduce = useMemo(() => prefersReducedMotion(), []);
  useEffect(() => setTier(detectQualityTier()), []);

  // The graph needs canvas room — 20 labeled nodes crammed into a phone width read
  // as clutter. So it's a ≥640px treat; narrower screens keep the clean text grid
  // (same responsive-degradation the pinned 3D / Career serpentine use). Tracked in
  // state + on resize so a rotate/resize across the breakpoint swaps cleanly.
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const useGraph = tier !== null && tier !== "low" && !reduce && wide;

  return (
    <section className="relative border-t border-white/5 px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <ScrambleText
          as="p"
          entrance="observer"
          className="mb-16 font-mono text-xs uppercase tracking-[0.3em] text-blue-400"
        >
          {eyebrow}
        </ScrambleText>

        {useGraph ? (
          <>
            {/* Screen-reader / SEO mirror of the graph's content. */}
            <ul className="sr-only">
              {skills.map((c) => (
                <li key={c.label}>
                  {c.label}: {c.items.join(", ")}
                </li>
              ))}
            </ul>
            <SkillGraphCanvas skills={skills} />
          </>
        ) : (
          <SkillsTextGrid skills={skills} />
        )}
      </div>
    </section>
  );
}
