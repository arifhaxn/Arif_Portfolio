"use client";

// -----------------------------------------------------------------------------
// SkillsConstellation — the About page's skills section as a living tech graph
// -----------------------------------------------------------------------------
// Replaces the flat two-column skill list with a canvas "neural / circuit"
// graph that reuses the site's established motion language: a central ARIF core
// wires out to one blue hub per category, each branching to its individual
// skills; bright pulses travel the links (like the project-card circuit traces),
// the whole field drifts and repels the cursor (like the robot's particle
// field), and hovering any node lights up its cluster.
//
// Behaviors:
//   • Grow-in reveal — on first scroll into view the nodes spring OUT of the
//     core along their links (a "graph assembling" moment), then idle-drift.
//   • Cursor trace — the nearest node's whole category brightens; a corner HUD
//     readout names it. On touch / no fine pointer, it AUTO-cycles the clusters
//     so the effect still reads without a cursor.
//   • Off-screen the render loop fully stops (IntersectionObserver), matching
//     HeroHead's frameloop pause — no idle CPU when scrolled away.
//
// Adaptive / accessible:
//   • Device tier (see lib/quality) or prefers-reduced-motion → render the
//     ORIGINAL clean text grid instead (no canvas, no loop) so weak hardware and
//     reduced-motion users keep the calm, fast version. Same tiering the 3D and
//     circuit backgrounds use.
//   • A visually-hidden list mirrors every skill for screen readers + SEO; the
//     canvas itself is aria-hidden decoration.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/animations";
import { detectQualityTier, type QualityTier } from "@/lib/quality";
import { ScrambleText } from "@/components/ScrambleText";

type SkillGroup = { label: string; items: string[] };

const BLUE = "#3b82f6";

// -----------------------------------------------------------------------------
// The canvas graph (only mounted on capable devices with motion allowed).
// -----------------------------------------------------------------------------
type Node = {
  type: "core" | "hub" | "leaf";
  label: string;
  cat: number; // -1 for the core
  x: number;
  y: number;
  vx: number;
  vy: number;
  hx: number; // home x
  hy: number; // home y
  ph: number; // drift phase
  r: number; // base radius
};
type Link = { a: Node; b: Node; pulse: number; speed: number };

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

    const finePointer =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let W = 0;
    let H = 0;
    let raf = 0;
    let running = false;
    let revealed = false;
    let reveal = 0; // 0→1 grow-in progress
    let t = 0;
    let lastMove = -1e9; // ms of last pointer activity
    let now = 0; // accumulated ms (no Date.now — resume-safe not needed here, but keep it frame-derived)

    const nodes: Node[] = [];
    const links: Link[] = [];
    const core: Node = {
      type: "core",
      label: "ARIF",
      cat: -1,
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
      const cx = W * 0.5;
      const cy = H * 0.5;
      core.hx = core.x = cx;
      core.hy = core.y = cy;
      nodes.push(core);
      const ringR = Math.min(W * 0.42, H * 0.4);
      const small = W < 640;
      skills.forEach((c, i) => {
        const a = (i / skills.length) * Math.PI * 2 - Math.PI / 2;
        const hx = cx + Math.cos(a) * ringR;
        const hy = cy + Math.sin(a) * ringR;
        const hub: Node = {
          type: "hub",
          label: c.label,
          cat: i,
          x: grow ? cx : hx,
          y: grow ? cy : hy,
          vx: 0,
          vy: 0,
          hx,
          hy,
          ph: (i * 1.7) % 6.28,
          r: 5,
        };
        nodes.push(hub);
        links.push({ a: core, b: hub, pulse: (i * 0.37) % 1, speed: 0.16 });
        const n = c.items.length;
        const leafR = (small ? 44 : 60) + n * 8;
        c.items.forEach((s, j) => {
          const la = a + (j - (n - 1) / 2) * (1.15 / Math.max(n, 2));
          const lx = hx + Math.cos(la) * leafR;
          const ly = hy + Math.sin(la) * leafR;
          const leaf: Node = {
            type: "leaf",
            label: s,
            cat: i,
            x: grow ? cx : lx,
            y: grow ? cy : ly,
            vx: 0,
            vy: 0,
            hx: lx,
            hy: ly,
            ph: (i * 3 + j) % 6.28,
            r: 3,
          };
          nodes.push(leaf);
          links.push({
            a: hub,
            b: leaf,
            pulse: (i * 2 + j) * 0.19 % 1,
            speed: 0.3 + (j % 3) * 0.08,
          });
        });
      });
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, rect.width);
      H = rect.width < 640 ? 520 : 460;
      canvas.style.height = `${H}px`;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build(revealed ? false : true);
    };

    const pad = 16;
    const clamp = (v: number, lo: number, hi: number) =>
      v < lo ? lo : v > hi ? hi : v;

    let lastActive = -1;
    const draw = (dt: number) => {
      t += dt;
      now += dt * 1000;
      if (!revealed) reveal = 0;
      else if (reveal < 1) reveal = Math.min(1, reveal + dt * 1.1);

      ctx.clearRect(0, 0, W, H);

      // faint HUD grid
      ctx.strokeStyle = "rgba(255,255,255,0.022)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }

      // physics: drift toward home + cursor repel, clamped to the canvas
      const ease = reveal * reveal * (3 - 2 * reveal); // smoothstep
      for (const nd of nodes) {
        if (nd.type === "core") continue;
        const driftX = Math.cos(t * 0.5 + nd.ph) * 4 * ease;
        const driftY = Math.sin(t * 0.45 + nd.ph) * 4 * ease;
        const tx = nd.hx + driftX;
        const ty = nd.hy + driftY;
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

      // active cluster — from the cursor, or auto-cycled when no fine pointer/idle
      let activeCat: number | null = null;
      const idle = now - lastMove > 2600;
      if (mouse.active && !idle) {
        let best = 28 * 28;
        let pick: Node | null = null;
        for (const nd of nodes) {
          const dx = nd.x - mouse.x;
          const dy = nd.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < best) {
            best = d2;
            pick = nd;
          }
        }
        if (pick && pick.cat >= 0) activeCat = pick.cat;
      } else if (reveal > 0.6) {
        // auto-trace: hold each cluster ~1.8s
        activeCat = Math.floor(now / 1800) % skills.length;
      }

      // links + travelling pulses
      for (const l of links) {
        const on =
          activeCat != null &&
          (l.b.cat === activeCat || (l.a.type === "core" && l.b.cat === activeCat));
        ctx.strokeStyle = on
          ? "rgba(59,130,246,0.55)"
          : `rgba(96,110,140,${0.16 * reveal})`;
        ctx.lineWidth = on ? 1.4 : 1;
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
          ctx.arc(px, py, on ? 2.4 : 1.6, 0, 6.283);
          ctx.fill();
        }
      }

      // core pulse ring (echoes the career "present" node)
      const pulseR = core.r + 6 + Math.sin(t * 1.6) * 3;
      ctx.strokeStyle = `rgba(59,130,246,${0.25 + 0.15 * Math.sin(t * 1.6)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(core.x, core.y, pulseR, 0, 6.283);
      ctx.stroke();

      // nodes + labels
      ctx.textAlign = "center";
      for (const nd of nodes) {
        const isActive = activeCat != null && nd.cat === activeCat;
        let col: string;
        let lab: string;
        let labCol: string;
        let size: number;
        if (nd.type === "core") {
          col = "#e4e4e7";
          lab = nd.label;
          labCol = "#a1a1aa";
          size = 10;
        } else if (nd.type === "hub") {
          col = BLUE;
          lab = nd.label.toUpperCase();
          labCol = isActive ? "#dbeafe" : "#71717a";
          size = 10;
        } else {
          col = isActive ? "#ffffff" : "#9ca3af";
          lab = nd.label;
          labCol = isActive ? "#ffffff" : "#52525b";
          size = W < 640 ? 11 : 12;
        }

        if (isActive) {
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, nd.r + 7, 0, 6.283);
          ctx.fillStyle =
            nd.type === "leaf" ? "rgba(255,255,255,0.08)" : "rgba(59,130,246,0.14)";
          ctx.fill();
        }
        ctx.globalAlpha = nd.type === "core" ? 1 : reveal;
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, nd.r, 0, 6.283);
        ctx.fillStyle = col;
        ctx.fill();
        if (nd.type !== "leaf") {
          ctx.strokeStyle = "rgba(59,130,246,0.35)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, nd.r + 3, 0, 6.283);
          ctx.stroke();
        }

        ctx.font = `${nd.type === "core" ? "700 " : ""}${size}px ui-monospace, Menlo, Consolas, monospace`;
        ctx.fillStyle = labCol;
        ctx.globalAlpha = nd.type === "core" ? 1 : reveal;
        if (nd.type === "core") {
          ctx.textBaseline = "middle";
          ctx.fillText(lab, nd.x, nd.y);
        } else {
          ctx.textBaseline = "top";
          ctx.fillText(lab, nd.x, nd.y + nd.r + 6);
        }
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
      lastMove = now;
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
      { threshold: 0.08 },
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
    <div
      ref={wrapRef}
      aria-hidden
      className="relative overflow-hidden rounded-xl border border-white/10 bg-[#050506]"
    >
      {/* corner HUD readouts, matching the site's mono/blue chrome */}
      <div className="pointer-events-none absolute left-4 top-3 z-10 font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-600">
        move · hover to trace
      </div>
      <div className="pointer-events-none absolute right-4 top-3 z-10 text-right font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-600">
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
// The original clean text grid — the low-tier / reduced-motion fallback.
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
