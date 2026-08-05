"use client";

// -----------------------------------------------------------------------------
// HalftonePortrait — static halftone-dot rendering of the hero cutout photo
// -----------------------------------------------------------------------------
// Replaces the About hero's "AH / Portrait — placeholder" card with a canvas-2D
// halftone-dot portrait built from a background-removed PNG
// (public/hero-portrait-cutout.png — its alpha channel is the subject mask, so
// only the subject gets dots and the background stays empty/transparent).
//
// Pipeline (tuned interactively and confirmed — the constants are exact):
//   1. draw source → grayscale (Rec.601 luma)
//   2. contrast ×1.4, then unsharp mask (blur r2px, amount 180%, threshold 2)
//   3. 5px source cells → per-cell average luma + alpha (computed ONCE)
//   4. per cell: skip if avg alpha < 140/255; else map luma → dot radius via
//      lum^1.85 × (cell·scale/2) × 0.92; a dot is visible when its radius at the
//      tuned 4× basis clears 0.5px (scale-invariant, so the dot SET matches the
//      tuned look at any size); draw a solid white circle at the cell centre.
//
// BRIGHTNESS + CRISPNESS: the dots are drawn once into an offscreen buffer at the
// tuned 4× scale (big, full-energy circles), then blitted into the display canvas
// (sized to CSS × devicePixelRatio) with a high-quality downscale. Drawing tiny
// circles directly at a small display scale made mid-tone dots sub-pixel, which
// AA under-filled → the face read dim; rendering big then downsampling preserves
// each dot's energy (matching the tuned source, which is itself a 4× view), while
// the display-resolution target keeps it sharp (no browser CSS-downscale mush).
// The heavy per-pixel pass AND the 4× dot buffer are cached; resize only re-blits.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { floatLoop, prefersReducedMotion } from "@/lib/animations";

const SRC = "/hero-portrait-cutout.png";

// --- tuned constants (do not "improve" without re-tuning against the source) ---
const CELL = 4; // source px per dot cell (finer grid = more, smaller dots → sharper)
const ALPHA_MIN = 140; // skip cells whose avg alpha < ~55% (transparent bg)
const CONTRAST = 1.4; // grayscale contrast multiplier
const USM_RADIUS = 2; // unsharp-mask blur radius (px)
const USM_AMOUNT = 1.8; // unsharp-mask amount (180%)
const USM_THRESHOLD = 2; // unsharp-mask threshold (0–255 luma delta)
// Brightness tune (overrides the original 1.85 / 0.92): a lower gamma grows the
// mid-tone dots so the face reads bright like the reference instead of dim; 1.0
// factor lets highlight dots just touch (fills the cell) without merging.
const DOT_GAMMA = 1.3; // luminance→radius falloff exponent (lower = brighter mids)
const DOT_FACTOR = 1.0; // radius scale within the cell

// --- entrance assembly (dots converge from scattered positions) ---
const ASSEMBLE_DURATION = 1.8; // s — total convergence time
const ASSEMBLE_STAGGER = 0.45; // max per-dot start delay (fraction of duration)
const SCATTER_OVERSCAN = 0.15; // dots start spread across the box + this margin
const IDLE_FLOAT = 10; // px — subtle up/down hover once assembled
const MIN_RADIUS = 0.5; // drop dots below this radius at the reference scale
const REF_SCALE = 4; // the tuned reference output scale (dot-set + max render res)

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

type Cells = {
  srcW: number;
  srcH: number;
  cols: number;
  rows: number;
  lum: Float32Array; // per-cell average luminance, 0–1
  alpha: Float32Array; // per-cell average alpha, 0–255
};

/** Heavy pass — grayscale → contrast → unsharp mask → per-cell averages. Once. */
function processImage(img: HTMLImageElement): Cells {
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  if (!srcW || !srcH) throw new Error("empty source image");

  const src = document.createElement("canvas");
  src.width = srcW;
  src.height = srcH;
  const sctx = src.getContext("2d", { willReadFrequently: true });
  if (!sctx) throw new Error("no 2d context");
  sctx.drawImage(img, 0, 0);
  const px = sctx.getImageData(0, 0, srcW, srcH).data;

  const N = srcW * srcH;
  const gray = new Float32Array(N);
  const alpha = new Uint8ClampedArray(N);
  for (let i = 0; i < N; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    alpha[i] = px[i * 4 + 3];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = clamp255((luma - 128) * CONTRAST + 128);
  }

  // unsharp mask: blur the grayscale (canvas blur ≈ radius px), add back the
  // high-frequency difference where it exceeds the threshold.
  const grayCanvas = document.createElement("canvas");
  grayCanvas.width = srcW;
  grayCanvas.height = srcH;
  const gctx = grayCanvas.getContext("2d", { willReadFrequently: true });
  if (!gctx) throw new Error("no 2d context");
  const grayImg = gctx.createImageData(srcW, srcH);
  for (let i = 0; i < N; i++) {
    const v = gray[i];
    grayImg.data[i * 4] = v;
    grayImg.data[i * 4 + 1] = v;
    grayImg.data[i * 4 + 2] = v;
    grayImg.data[i * 4 + 3] = 255;
  }
  gctx.putImageData(grayImg, 0, 0);

  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = srcW;
  blurCanvas.height = srcH;
  const bctx = blurCanvas.getContext("2d", { willReadFrequently: true });
  if (!bctx) throw new Error("no 2d context");
  bctx.filter = `blur(${USM_RADIUS}px)`;
  bctx.drawImage(grayCanvas, 0, 0);
  const blur = bctx.getImageData(0, 0, srcW, srcH).data;

  const lum = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const diff = gray[i] - blur[i * 4];
    lum[i] = clamp255(Math.abs(diff) > USM_THRESHOLD ? gray[i] + USM_AMOUNT * diff : gray[i]);
  }

  // per-cell averages of luma (→0–1) + alpha.
  const cols = Math.ceil(srcW / CELL);
  const rows = Math.ceil(srcH / CELL);
  const sumL = new Float32Array(cols * rows);
  const sumA = new Float32Array(cols * rows);
  const count = new Uint32Array(cols * rows);
  for (let y = 0; y < srcH; y++) {
    const cy = (y / CELL) | 0;
    for (let x = 0; x < srcW; x++) {
      const ci = cy * cols + ((x / CELL) | 0);
      const i = y * srcW + x;
      sumL[ci] += lum[i];
      sumA[ci] += alpha[i];
      count[ci]++;
    }
  }
  const cellLum = new Float32Array(cols * rows);
  const cellAlpha = new Float32Array(cols * rows);
  for (let ci = 0; ci < cols * rows; ci++) {
    const c = count[ci];
    if (!c) continue;
    cellLum[ci] = sumL[ci] / c / 255;
    cellAlpha[ci] = sumA[ci] / c;
  }
  return { srcW, srcH, cols, rows, lum: cellLum, alpha: cellAlpha };
}

/** Render the white dots once into an offscreen buffer at the tuned 4× scale. */
function renderDotBuffer(cells: Cells): HTMLCanvasElement {
  const { srcW, srcH, cols, rows, lum, alpha } = cells;
  const off = document.createElement("canvas");
  off.width = srcW * REF_SCALE;
  off.height = srcH * REF_SCALE;
  const ctx = off.getContext("2d");
  if (!ctx) return off;
  ctx.fillStyle = "#ffffff";
  const maxRadius = ((CELL * REF_SCALE) / 2) * DOT_FACTOR; // 9.2px at luma=1
  const TAU = Math.PI * 2;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const ci = cy * cols + cx;
      if (alpha[ci] < ALPHA_MIN) continue; // background / soft edge → no dot
      const radius = Math.pow(lum[ci], DOT_GAMMA) * maxRadius;
      if (radius < MIN_RADIUS) continue; // shadows fall away to nothing
      const ox = (cx * CELL + CELL / 2) * REF_SCALE;
      const oy = (cy * CELL + CELL / 2) * REF_SCALE;
      ctx.beginPath();
      ctx.arc(ox, oy, radius, 0, TAU);
      ctx.fill();
    }
  }
  return off;
}

/** Blit the 4× dot buffer into the display canvas at CSS × dpr (quality downscale). */
function blit(canvas: HTMLCanvasElement, buffer: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || buffer.width;
  const cssH = canvas.clientHeight || buffer.height;
  canvas.width = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(buffer, 0, 0, canvas.width, canvas.height);
}

// --- entrance assembly -------------------------------------------------------

type Dots = {
  n: number;
  srcW: number;
  srcH: number;
  tx: Float32Array; // target cell centre (source space)
  ty: Float32Array;
  g: Float32Array; // luma^gamma → radius factor
  sx: Float32Array; // scattered start (source space)
  sy: Float32Array;
  delay: Float32Array; // 0..ASSEMBLE_STAGGER
};

/** Build the flat dot list (targets + random scatter starts) for the assembly. */
function buildDots(cells: Cells): Dots {
  const { srcW, srcH, cols, rows, lum, alpha } = cells;
  const refMax = ((CELL * REF_SCALE) / 2) * DOT_FACTOR;
  const tx: number[] = [], ty: number[] = [], g: number[] = [];
  const sx: number[] = [], sy: number[] = [], delay: number[] = [];
  const span = 1 + SCATTER_OVERSCAN * 2;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const ci = cy * cols + cx;
      if (alpha[ci] < ALPHA_MIN) continue;
      const gg = Math.pow(lum[ci], DOT_GAMMA);
      if (gg * refMax < MIN_RADIUS) continue; // same dot set as the static image
      tx.push(cx * CELL + CELL / 2);
      ty.push(cy * CELL + CELL / 2);
      g.push(gg);
      sx.push((Math.random() * span - SCATTER_OVERSCAN) * srcW);
      sy.push((Math.random() * span - SCATTER_OVERSCAN) * srcH);
      delay.push(Math.random() * ASSEMBLE_STAGGER);
    }
  }
  return {
    n: tx.length, srcW, srcH,
    tx: new Float32Array(tx), ty: new Float32Array(ty), g: new Float32Array(g),
    sx: new Float32Array(sx), sy: new Float32Array(sy), delay: new Float32Array(delay),
  };
}

/** Draw one assembly frame at progress `t` (0→1) into the 4× scratch buffer: dots
 *  ease from scatter→target, fading + growing in. Rendered at the SAME 4× scale as
 *  the final buffer, so at t=1 the scratch is pixel-identical to `renderDotBuffer`
 *  — the caller then quality-downscales it, so the last frame equals the settled
 *  image exactly (no brightness pop/flash at the transition). */
function drawAssemblyFrame(scratch: HTMLCanvasElement, dots: Dots, t: number) {
  const ctx = scratch.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, scratch.width, scratch.height);
  ctx.fillStyle = "#ffffff";
  const rBase = ((CELL * REF_SCALE) / 2) * DOT_FACTOR; // == final buffer's maxRadius
  const TAU = Math.PI * 2;
  for (let i = 0; i < dots.n; i++) {
    const d = dots.delay[i];
    const local = d >= 1 ? 0 : Math.min(1, Math.max(0, (t - d) / (1 - d)));
    const inv = 1 - local;
    const e = 1 - inv * inv * inv; // easeOutCubic per dot
    const x = (dots.sx[i] + (dots.tx[i] - dots.sx[i]) * e) * REF_SCALE;
    const y = (dots.sy[i] + (dots.ty[i] - dots.sy[i]) * e) * REF_SCALE;
    const r = dots.g[i] * rBase * (0.45 + 0.55 * e);
    if (r <= 0.02) continue;
    ctx.globalAlpha = 0.12 + 0.88 * e; // faint when scattered → solid at rest
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * Halftone-dot hero portrait. On mount the dots converge from scattered
 * background positions and assemble the image, then settle into the exact crisp
 * static render (the 4× buffer blit). Reduced motion skips the assembly and shows
 * the final image immediately. If the source PNG is missing/undecodable, a
 * clearly-flagged placeholder card stands in instead of crashing.
 */
export function HalftonePortrait() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let buffer: HTMLCanvasElement | null = null; // crisp final image (4× dot render)
    let scratch: HTMLCanvasElement | null = null; // 4× per-frame assembly render
    let dots: Dots | null = null;
    let settled = false;
    let lastKey = "";
    let tween: gsap.core.Tween | null = null;
    let idleTween: gsap.core.Tween | gsap.core.Timeline | null = null;
    const reduce = prefersReducedMotion();

    // Subtle up/down hover once the portrait has assembled (reduced-motion safe).
    const startIdle = () => {
      if (cancelled || !wrapperRef.current) return;
      idleTween = floatLoop(wrapperRef.current, IDLE_FLOAT);
    };

    const sizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round((canvas.clientWidth || 1) * dpr));
      canvas.height = Math.max(1, Math.round((canvas.clientHeight || 1) * dpr));
    };

    // Blit the exact, crisp static image; cache the size so resize re-blits once.
    const blitFinal = () => {
      if (!buffer || cancelled) return;
      const dpr = window.devicePixelRatio || 1;
      const key = `${canvas.clientWidth}x${canvas.clientHeight}@${dpr}`;
      if (key === lastKey) return;
      lastKey = key;
      blit(canvas, buffer);
    };

    // Render one assembly frame: draw the moving dots into the 4× scratch, then
    // quality-downscale to the display canvas — the SAME path as the final image,
    // so t=1 already equals the settled render (no transition pop).
    const drawFrame = (t: number) => {
      if (!dots || !scratch) return;
      drawAssemblyFrame(scratch, dots, t);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(scratch, 0, 0, canvas.width, canvas.height);
    };

    // Settle: the last assembly frame is already pixel-identical to the buffer, so
    // just lock the exact static image (no crossfade / no brightness flash).
    const settle = () => {
      settled = true;
      lastKey = "";
      blitFinal();
      startIdle();
    };

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      try {
        const cells = processImage(img);
        buffer = renderDotBuffer(cells); // the exact image the assembly settles into
        if (reduce) {
          settle(); // reduced motion: no assembly, show the final image
          return;
        }
        dots = buildDots(cells);
        scratch = document.createElement("canvas");
        scratch.width = buffer.width;
        scratch.height = buffer.height;
        sizeCanvas();
        const p = { t: 0 };
        drawFrame(0); // paint the initial scattered frame immediately
        tween = gsap.to(p, {
          t: 1,
          duration: ASSEMBLE_DURATION,
          ease: "none", // per-dot easeOutCubic + stagger shapes the feel
          onUpdate: () => drawFrame(p.t),
          onComplete: settle,
        });
      } catch {
        setFailed(true);
      }
    };
    img.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    img.src = SRC;

    // Only re-blit on resize once the assembly has settled; mid-animation resizes
    // just adopt the new backing size on the next frame.
    const ro = new ResizeObserver(() => {
      if (settled) blitFinal();
      else if (!reduce) sizeCanvas();
    });
    ro.observe(canvas);
    return () => {
      cancelled = true;
      tween?.kill();
      idleTween?.kill();
      ro.disconnect();
    };
  }, []);

  return (
    // Tall, prominent portrait; the parent centers it in the hero. Dots stay
    // crisp + bright at any size via the 4× buffer → quality downscale (header).
    <div
      ref={wrapperRef}
      data-hero-portrait
      aria-hidden
      className="relative aspect-[471/530] h-[clamp(22rem,88vmin,52rem)] will-change-transform"
    >
      {failed ? (
        // Fallback: the original placeholder card, clearly flagged.
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black ring-1 ring-white/15">
          <span className="font-mono text-6xl font-semibold text-white/10">AH</span>
          <span className="h-px w-12 bg-blue-500" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">
            Portrait — placeholder
          </span>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="block h-full w-full"
          // Fade the lower portion to transparent so the shoulders blend into the
          // page's black instead of ending on a hard edge.
          style={{
            maskImage: "linear-gradient(to bottom, #000 58%, transparent 96%)",
            WebkitMaskImage: "linear-gradient(to bottom, #000 58%, transparent 96%)",
          }}
        />
      )}
    </div>
  );
}
