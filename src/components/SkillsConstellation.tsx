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
// Layout is generated, organic, and self-spacing:
//   • Seeded jitter on every hub/leaf angle + distance → an irregular, neural-net
//     look rather than a symmetric wheel. Deterministic per skill name, so it's
//     stable across renders yet reshapes as you add/rename skills.
//   • A collision-relaxation pass measures each label and pushes nodes apart until
//     no two label boxes overlap, then clamps everything inside the canvas — so
//     text never collides, and the whole graph auto-reflows when branches change.
//   • The layout fills the canvas's wide aspect, and the canvas grows taller with
//     the node count, so there's always room.
//
// Behaviors: grow-in reveal from the core, cursor-proximity trace (nearest link's
// cluster lights blue; auto-cycles on touch), cursor repulsion, and a render loop
// that fully stops off-screen (IntersectionObserver), like HeroHead.
//
// Adaptive / accessible: device tier (lib/quality), reduced-motion, or a phone
// width → the ORIGINAL clean text grid instead. A visually-hidden list mirrors
// every skill for screen readers + SEO; the canvas is aria-hidden decoration.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/animations";
import { detectQualityTier, type QualityTier } from "@/lib/quality";
import { uiScale } from "@/lib/uiScale";
import { ScrambleText } from "@/components/ScrambleText";

type SkillGroup = { label: string; items: string[] };

const BLUE = "#3b82f6";
const TAU = Math.PI * 2;

// --- deterministic tiny PRNG (so the "random" layout is stable per data) ------
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function makeRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

// -----------------------------------------------------------------------------
// The canvas graph (only mounted on capable, wide-enough devices, motion on).
// -----------------------------------------------------------------------------
type Node = {
  type: "core" | "hub" | "leaf";
  label: string;
  cat: number; // -1 for the core
  ax: number; // organic anchor (pre-relax)
  ay: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hx: number; // relaxed home
  hy: number;
  ph: number; // drift phase
  r: number; // dot radius
  lw: number; // measured label width (px)
  lh: number; // label font size (px)
};
type Link = { a: Node; b: Node; pulse: number; speed: number };

/** Shortest distance from point (px,py) to segment a→b. */
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

function SkillGraphCanvas({ skills, logo }: { skills: SkillGroup[]; logo: string }) {
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

    // Logo drawn inside the core. crossOrigin so a Cloudinary-hosted logo can be
    // drawn (and read back) without tainting the canvas.
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    let logoReady = false;
    logoImg.onload = () => {
      logoReady = true;
    };
    logoImg.src = logo;

    const sizeOf = (t: Node["type"]) => (t === "core" ? 13 : t === "hub" ? 12 : 15);

    // W/H are DESIGN pixels (see resize) — the same numbers on every display.
    let W = 0;
    let H = 0;
    // Design-pixels → CSS-pixels factor folded into the canvas transform by
    // resize(); pointer events arrive in CSS pixels and divide back down by it.
    let pointerScale = 1;
    let raf = 0;
    let running = false;
    let revealed = false;
    let reveal = 0;
    let t = 0;
    let now = 0;

    const nodes: Node[] = [];
    const links: Link[] = [];
    const core: Node = {
      type: "core",
      label: "ARIF",
      cat: -1,
      ax: 0,
      ay: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      hx: 0,
      hy: 0,
      ph: 0,
      r: 20, // big enough to hold the logo; keeps other nodes clear of it
      lw: 0,
      lh: 13,
    };
    const mouse = { x: -1e4, y: -1e4, active: false };

    const clamp = (v: number, lo: number, hi: number) =>
      v < lo ? lo : v > hi ? hi : v;

    // Label AABB (a node's dot + its label below it), with breathing-room gap.
    // Larger gap = more space between every label (the relaxation still guarantees
    // no overlap at any count; this just makes the resting spacing roomier).
    const GAP = 16;
    const boxHalfW = (nd: Node) => Math.max(nd.lw, nd.r * 2) / 2 + GAP;
    const boxTop = (nd: Node) => nd.y - nd.r - GAP;
    const boxBot = (nd: Node) => nd.y + nd.r + 7 + nd.lh + GAP;

    // Push overlapping label boxes apart along their minimum-translation axis.
    // `withSpring` also eases each node back toward its organic anchor so the
    // graph keeps its shape; the final passes drop the spring so separation wins.
    const relaxStep = (withSpring: boolean, withEdge = true) => {
      if (withSpring) {
        for (const nd of nodes) {
          if (nd.type === "core") continue;
          nd.x += (nd.ax - nd.x) * 0.05;
          nd.y += (nd.ay - nd.y) * 0.05;
        }
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const A = nodes[i];
          const B = nodes[j];
          const ahw = boxHalfW(A);
          const bhw = boxHalfW(B);
          const ox = Math.min(A.x + ahw, B.x + bhw) - Math.max(A.x - ahw, B.x - bhw);
          const oy = Math.min(boxBot(A), boxBot(B)) - Math.max(boxTop(A), boxTop(B));
          if (ox > 0 && oy > 0) {
            if (ox < oy) {
              const push = ox / 2 + 0.5;
              const dir = A.x <= B.x ? 1 : -1;
              if (A.type !== "core") A.x -= dir * push;
              if (B.type !== "core") B.x += dir * push;
            } else {
              const push = oy / 2 + 0.5;
              const dir = A.y <= B.y ? 1 : -1;
              if (A.type !== "core") A.y -= dir * push;
              if (B.type !== "core") B.y += dir * push;
            }
          }
        }
      }

      // Edge clearance: keep each label off of every branch line it isn't part of
      // (label-vs-label separation alone lets a line pass straight through a
      // label — the "too close to the branch" problem). Push the node away from
      // the nearest point of any foreign link its label crowds.
      const CLEAR = 15;
      if (withEdge) for (const nd of nodes) {
        if (nd.type === "core") continue;
        const hw = Math.max(nd.lw, nd.r * 2) / 2;
        const bl = nd.x - hw;
        const br = nd.x + hw;
        const bt = nd.y - nd.r - 4; // dot + label band
        const bb = nd.y + nd.r + 7 + nd.lh;
        const bcx = nd.x;
        const bcy = (bt + bb) / 2;
        for (const l of links) {
          if (l.a === nd || l.b === nd) continue; // its own branch is fine
          const ax = l.a.x;
          const ay = l.a.y;
          const dxs = l.b.x - ax;
          const dys = l.b.y - ay;
          const len2 = dxs * dxs + dys * dys || 1;
          let t = ((bcx - ax) * dxs + (bcy - ay) * dys) / len2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const cx2 = ax + t * dxs;
          const cy2 = ay + t * dys;
          // closest point ON the label box to that segment point
          const nx = cx2 < bl ? bl : cx2 > br ? br : cx2;
          const ny = cy2 < bt ? bt : cy2 > bb ? bb : cy2;
          let dx = nx - cx2;
          let dy = ny - cy2;
          let d = Math.sqrt(dx * dx + dy * dy);
          if (d < CLEAR) {
            if (d < 0.01) {
              dx = bcx - cx2;
              dy = bcy - cy2;
              d = Math.sqrt(dx * dx + dy * dy) || 1;
            }
            const push = (CLEAR - d) * 0.8;
            nd.x += (dx / d) * push;
            nd.y += (dy / d) * push;
          }
        }
      }

      const m = 8;
      for (const nd of nodes) {
        if (nd.type === "core") continue;
        const hw = boxHalfW(nd);
        nd.x = clamp(nd.x, m + hw, W - m - hw);
        nd.y = clamp(nd.y, m + nd.r + GAP, H - m - nd.r - 7 - nd.lh - GAP);
      }
    };

    const build = (grow: boolean) => {
      nodes.length = 0;
      links.length = 0;
      const cx = W / 2;
      const cy = H / 2;
      core.ax = core.x = core.hx = cx;
      core.ay = core.y = core.hy = cy;
      nodes.push(core);

      const N = skills.length;
      const minWH = Math.min(W, H);
      skills.forEach((c, i) => {
        const rnd = makeRng(hashStr(c.label) ^ (i * 0x9e3779b1));
        // Even angular coverage (small jitter) so no direction is left empty, but
        // varied ring radius per hub keeps it asymmetric — not a clean wheel. Hubs
        // sit fairly close to the core; the fit-to-fill pass below scales the whole
        // thing up to fill the canvas, so these are proportions, not final sizes.
        const a = (i / N) * TAU - Math.PI / 2 + (rnd() - 0.5) * (TAU / N) * 0.3;
        const ex = W * 0.235 * (0.85 + rnd() * 0.4);
        const ey = H * 0.255 * (0.85 + rnd() * 0.4);
        const hx = cx + Math.cos(a) * ex;
        const hy = cy + Math.sin(a) * ey;
        const hub: Node = {
          type: "hub",
          label: c.label,
          cat: i,
          ax: hx,
          ay: hy,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          hx: 0,
          hy: 0,
          ph: rnd() * TAU,
          r: 5,
          lw: 0,
          lh: sizeOf("hub"),
        };
        nodes.push(hub);
        links.push({ a: core, b: hub, pulse: rnd(), speed: 0.16 });

        const n = c.items.length;
        const outA = Math.atan2(hy - cy, hx - cx); // fan leaves outward from core
        c.items.forEach((s, j) => {
          const rl = makeRng(hashStr(s) ^ (i * 0x27d4eb2f) ^ (j * 0x165667b1));
          // Wide fan so a cluster's branches DIVERGE (narrow fans make the
          // branch lines run parallel and labels crowd the next branch). The
          // per-leaf angle grows with the label so wide names splay more; the
          // relaxation then only has to fine-tune, not untangle.
          const spanPerLeaf = 0.85; // radians between adjacent leaves in a cluster
          const la =
            outA +
            (j - (n - 1) / 2) * spanPerLeaf +
            (rl() - 0.5) * 0.35;
          const ld = minWH * 0.18 * (0.85 + rl() * 0.4);
          const leaf: Node = {
            type: "leaf",
            label: s,
            cat: i,
            ax: hx + Math.cos(la) * ld,
            ay: hy + Math.sin(la) * ld,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            hx: 0,
            hy: 0,
            ph: rl() * TAU,
            r: 3,
            lw: 0,
            lh: sizeOf("leaf"),
          };
          nodes.push(leaf);
          links.push({
            a: hub,
            b: leaf,
            pulse: rl(),
            speed: 0.3 + (j % 3) * 0.08,
          });
        });
      });

      // measure labels, seed positions at anchors
      for (const nd of nodes) {
        ctx.font = `700 ${nd.lh}px ${fontFamily}`;
        const text = nd.type === "hub" ? nd.label.toUpperCase() : nd.label;
        nd.lw = nd.type === "core" ? 0 : ctx.measureText(text).width;
        nd.x = nd.ax;
        nd.y = nd.ay;
      }

      // relaxation: settle with spring, then separation-only so the FINAL state is
      // guaranteed overlap-free (springs can't tug two labels back together).
      for (let k = 0; k < 260; k++) relaxStep(true);
      for (let k = 0; k < 120; k++) relaxStep(false);
      // final pass: label-separation only, so no label overlap can survive the
      // edge-avoidance nudges (edge clearance runs before this and may push a
      // label a hair into a neighbour; these passes settle that last).
      for (let k = 0; k < 40; k++) relaxStep(false, false);

      // Fit-to-fill: uniformly scale the settled layout up around the core so it
      // fills the canvas (no big empty margins). Scaling only GROWS the gaps
      // between fixed-size labels, so it can never reintroduce an overlap; and it
      // preserves the main-line : branch proportion set above.
      {
        const cxv = W / 2;
        const cyv = H / 2;
        let R = 1;
        let L = 1;
        let T = 1;
        let B = 1;
        for (const nd of nodes) {
          const hw = boxHalfW(nd);
          R = Math.max(R, nd.x + hw - cxv);
          L = Math.max(L, cxv - (nd.x - hw));
          T = Math.max(T, cyv - boxTop(nd));
          B = Math.max(B, boxBot(nd) - cyv);
        }
        const m = 12;
        // Cap the scale so filling the margins doesn't blow the graph up (which
        // would dwarf the branches next to the main lines).
        const s = Math.min(
          1.45,
          (cxv - m) / L,
          (cxv - m) / R,
          (cyv - m) / T,
          (cyv - m) / B,
        );
        if (s > 1.001) {
          for (const nd of nodes) {
            if (nd.type === "core") continue;
            nd.x = cxv + (nd.x - cxv) * s;
            nd.y = cyv + (nd.y - cyv) * s;
          }
        }
      }

      for (const nd of nodes) {
        nd.hx = nd.x;
        nd.hy = nd.y;
        if (grow && nd.type !== "core") {
          nd.x = core.hx;
          nd.y = core.hy;
        }
        nd.vx = 0;
        nd.vy = 0;
      }

      if (process.env.NODE_ENV !== "production") {
        try {
          (window as unknown as { __skillNodes?: unknown }).__skillNodes = nodes.map(
            (n) => ({ label: n.label, type: n.type, cat: n.cat, hx: n.hx, hy: n.hy, lw: n.lw, lh: n.lh, r: n.r }),
          );
        } catch {
          /* debug hook only */
        }
      }
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Every number in this graph — node radii, label font sizes, the GAP/CLEAR
      // relaxation distances, the canvas height ramp — is a raw pixel literal, so
      // on a big monitor the whole constellation would have stayed 1920-sized
      // inside a container that grew (see lib/uiScale). Rather than multiply each
      // literal, fold the scale into the context transform and keep W/H in DESIGN
      // pixels: the layout then solves in exactly the same coordinate space at
      // every viewport and simply draws bigger. A happy side effect is that the
      // `W >= 1024` height branch and the collision relaxation now see identical
      // inputs on a 1920 and a 2560 screen, so the graph's SHAPE is stable too.
      const S = uiScale();
      W = Math.max(1, rect.width / S);
      // canvas grows taller as branches are added, so there's always room
      const total = 1 + skills.length + totalSkills;
      H = clamp((W >= 1024 ? 680 : 560) + Math.max(0, total - 14) * 15, 560, 960);
      // CSS box is the design height scaled up; the backing store adds DPR on top.
      canvas.style.height = `${H * S}px`;
      canvas.width = Math.round(W * S * dpr);
      canvas.height = Math.round(H * S * dpr);
      ctx.setTransform(dpr * S, 0, 0, dpr * S, 0, 0);
      pointerScale = S;
      build(!revealed);
    };

    const EDGE_HIT = 48;
    let lastActive = -1;

    const draw = (dt: number) => {
      t += dt;
      now += dt * 1000;
      if (!revealed) reveal = 0;
      else if (reveal < 1) reveal = Math.min(1, reveal + dt * 1.1);
      const ease = reveal * reveal * (3 - 2 * reveal);

      ctx.clearRect(0, 0, W, H);

      // physics: gentle drift toward home + cursor repel (small amp so the
      // no-overlap layout is preserved), clamped to the canvas
      for (const nd of nodes) {
        if (nd.type === "core") continue;
        const tx = nd.hx + Math.cos(t * 0.5 + nd.ph) * 2 * ease;
        const ty = nd.hy + Math.sin(t * 0.45 + nd.ph) * 2 * ease;
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
        nd.x += nd.vx;
        nd.y += nd.vy;
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
        const on = activeCat != null && l.b.cat === activeCat;
        ctx.strokeStyle = on
          ? "rgba(96,165,250,0.75)"
          : `rgba(128,148,182,${0.32 * reveal})`;
        ctx.lineWidth = on ? 2.6 : 1.7;
        ctx.beginPath();
        ctx.moveTo(l.a.x, l.a.y);
        ctx.lineTo(l.b.x, l.b.y);
        ctx.stroke();
        if (reveal > 0.5) {
          l.pulse += l.speed * dt;
          if (l.pulse > 1) l.pulse -= 1;
          const px = l.a.x + (l.b.x - l.a.x) * l.pulse;
          const py = l.a.y + (l.b.y - l.a.y) * l.pulse;
          ctx.fillStyle = on ? "rgba(191,219,254,0.98)" : "rgba(96,165,250,0.65)";
          ctx.beginPath();
          ctx.arc(px, py, on ? 3 : 2, 0, TAU);
          ctx.fill();
        }
      }

      // --- core: the logo in a glowing, pulsing ring (replaces the ARIF text) ---
      const CR = core.r;
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.7);
      // soft glow halo, breathing
      ctx.beginPath();
      ctx.arc(core.x, core.y, CR + 9 + pulse * 8, 0, TAU);
      ctx.fillStyle = `rgba(59,130,246,${0.05 + pulse * 0.13})`;
      ctx.fill();
      // an expanding ring that fades outward — the "pulse"
      const ringP = (t * 0.55) % 1;
      ctx.beginPath();
      ctx.arc(core.x, core.y, CR + 2 + ringP * 26, 0, TAU);
      ctx.strokeStyle = `rgba(59,130,246,${(1 - ringP) * 0.5})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // dark disc backing so the logo reads on any link behind it
      ctx.beginPath();
      ctx.arc(core.x, core.y, CR, 0, TAU);
      ctx.fillStyle = "#08080a";
      ctx.fill();
      // the logo, contained (no distortion) + clipped to the circle
      if (logoReady) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(core.x, core.y, CR - 2, 0, TAU);
        ctx.clip();
        const iw = logoImg.naturalWidth || 1;
        const ih = logoImg.naturalHeight || 1;
        const boxD = (CR - 3) * 2;
        const sc = Math.min(boxD / iw, boxD / ih);
        const dw = iw * sc;
        const dh = ih * sc;
        ctx.drawImage(logoImg, core.x - dw / 2, core.y - dh / 2, dw, dh);
        ctx.restore();
      }
      // blue ring border
      ctx.beginPath();
      ctx.arc(core.x, core.y, CR, 0, TAU);
      ctx.strokeStyle = "rgba(59,130,246,0.75)";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // nodes + labels
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (const nd of nodes) {
        if (nd.type === "core") continue; // core is the logo, drawn above
        const isActive = activeCat != null && nd.cat === activeCat;
        let col: string;
        let lab: string;
        let labCol: string;
        if (nd.type === "hub") {
          col = BLUE;
          lab = nd.label.toUpperCase();
          labCol = isActive ? "#dbeafe" : "#a1a1aa";
        } else {
          col = isActive ? "#ffffff" : "#d4d4d8";
          lab = nd.label;
          labCol = isActive ? "#ffffff" : "#a1a1aa";
        }

        if (isActive) {
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, nd.r + 7, 0, TAU);
          ctx.fillStyle =
            nd.type === "leaf" ? "rgba(255,255,255,0.10)" : "rgba(59,130,246,0.16)";
          ctx.fill();
        }

        ctx.globalAlpha = reveal;
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

        ctx.font = `700 ${nd.lh}px ${fontFamily}`;
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
      // Back into design space so the proximity tests below (EDGE_HIT, the repel
      // radius) keep the same on-screen feel at every scale.
      mouse.x = (e.clientX - r.left) / pointerScale;
      mouse.y = (e.clientY - r.top) / pointerScale;
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
  }, [skills, totalSkills, logo]);

  return (
    <div ref={wrapRef} aria-hidden className="relative">
      <div className="pointer-events-none absolute left-0 top-0 z-10 font-mono text-[0.625rem] uppercase tracking-[0.15em] text-zinc-600">
        move cursor near a link to trace
      </div>
      <div className="pointer-events-none absolute right-0 top-0 z-10 text-right font-mono text-[0.625rem] uppercase tracking-[0.15em] text-zinc-600">
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
  logo = "/arif-logo.png",
}: {
  skills: SkillGroup[];
  eyebrow: string;
  /** Logo drawn in the core (defaults to the site mark; admin logo passed in). */
  logo?: string;
}) {
  const [tier, setTier] = useState<QualityTier | null>(null);
  const reduce = useMemo(() => prefersReducedMotion(), []);
  useEffect(() => setTier(detectQualityTier()), []);

  // The graph needs canvas room — many labeled nodes on a phone width read as
  // clutter — so it's a ≥640px treat; narrower screens keep the clean text grid.
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
            <ul className="sr-only">
              {skills.map((c) => (
                <li key={c.label}>
                  {c.label}: {c.items.join(", ")}
                </li>
              ))}
            </ul>
            <SkillGraphCanvas skills={skills} logo={logo} />
          </>
        ) : (
          <SkillsTextGrid skills={skills} />
        )}
      </div>
    </section>
  );
}
