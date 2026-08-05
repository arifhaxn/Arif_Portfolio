"use client";

// -----------------------------------------------------------------------------
// HalftonePortrait — static halftone-dot rendering of the hero cutout photo
// -----------------------------------------------------------------------------
// Replaces the About hero's "AH / Portrait — placeholder" card with a canvas-2D
// halftone-dot portrait built ONCE on mount from a background-removed PNG
// (public/hero-portrait-cutout.png — its alpha channel is the subject mask, so
// only the subject gets dots and the background stays empty/transparent).
//
// The algorithm + constants below were tuned interactively and confirmed — they
// are intentionally exact, not a re-derivation:
//   1. draw source → grayscale (Rec.601 luma)
//   2. contrast ×1.4, then an unsharp-mask sharpen (blur r2px, amount 180%,
//      threshold 2) — the source is low-res (471×530), so this keeps dots crisp
//   3. 5px source cells, rendered into a canvas 4× the source size
//   4. per cell: skip if avg alpha < 140/255; else map avg luma → dot radius
//      via lum^1.85 × (cell·scale/2) × 0.92; skip radii < 0.5px (shadows fall to
//      nothing); draw a solid white circle at the cell centre.
// It's a STATIC image (not per-frame WebGL): drawn once, then cached on the
// canvas. CSS scales the fixed-resolution canvas to the card's footprint; the
// fade+rise entrance is driven by `heroTitleIn` from the About hero.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";

const SRC = "/hero-portrait-cutout.png";

// --- tuned constants (do not "improve" without re-tuning against the source) ---
const OUTPUT_SCALE = 4; // render canvas at 4× the source dimensions
const CELL = 5; // source px per dot cell
const ALPHA_MIN = 140; // skip cells whose avg alpha < ~55% (transparent bg)
const CONTRAST = 1.4; // grayscale contrast multiplier
const USM_RADIUS = 2; // unsharp-mask blur radius (px)
const USM_AMOUNT = 1.8; // unsharp-mask amount (180%)
const USM_THRESHOLD = 2; // unsharp-mask threshold (0–255 luma delta)
const DOT_GAMMA = 1.85; // luminance→radius falloff exponent
const DOT_FACTOR = 0.92; // radius scale within the cell
const MIN_RADIUS = 0.5; // drop sub-half-pixel dots (shadows → nothing)

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Draw the halftone portrait into `canvas` from a loaded `img`. Runs once. */
function renderHalftone(canvas: HTMLCanvasElement, img: HTMLImageElement) {
  const SW = img.naturalWidth;
  const SH = img.naturalHeight;
  if (!SW || !SH) throw new Error("empty source image");

  // 1 — source pixels (RGB for luma, A for the subject mask).
  const src = document.createElement("canvas");
  src.width = SW;
  src.height = SH;
  const sctx = src.getContext("2d", { willReadFrequently: true });
  if (!sctx) throw new Error("no 2d context");
  sctx.drawImage(img, 0, 0);
  const px = sctx.getImageData(0, 0, SW, SH).data;

  const N = SW * SH;
  const gray = new Float32Array(N); // grayscale + contrast
  const alpha = new Uint8ClampedArray(N);
  for (let i = 0; i < N; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    alpha[i] = px[i * 4 + 3];
    // 2a — Rec.601 luma → contrast about mid-grey.
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = clamp255((luma - 128) * CONTRAST + 128);
  }

  // 2b — unsharp mask: blur the grayscale (canvas blur ≈ radius px), then add
  // back the high-frequency difference where it exceeds the threshold.
  const grayCanvas = document.createElement("canvas");
  grayCanvas.width = SW;
  grayCanvas.height = SH;
  const gctx = grayCanvas.getContext("2d", { willReadFrequently: true });
  if (!gctx) throw new Error("no 2d context");
  const grayImg = gctx.createImageData(SW, SH);
  for (let i = 0; i < N; i++) {
    const v = gray[i];
    grayImg.data[i * 4] = v;
    grayImg.data[i * 4 + 1] = v;
    grayImg.data[i * 4 + 2] = v;
    grayImg.data[i * 4 + 3] = 255;
  }
  gctx.putImageData(grayImg, 0, 0);

  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = SW;
  blurCanvas.height = SH;
  const bctx = blurCanvas.getContext("2d", { willReadFrequently: true });
  if (!bctx) throw new Error("no 2d context");
  bctx.filter = `blur(${USM_RADIUS}px)`;
  bctx.drawImage(grayCanvas, 0, 0);
  const blur = bctx.getImageData(0, 0, SW, SH).data;

  const lum = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const diff = gray[i] - blur[i * 4]; // blurred is grey → R channel
    lum[i] = clamp255(Math.abs(diff) > USM_THRESHOLD ? gray[i] + USM_AMOUNT * diff : gray[i]);
  }

  // 3 — accumulate per-cell averages of luma + alpha.
  const cols = Math.ceil(SW / CELL);
  const rows = Math.ceil(SH / CELL);
  const sumL = new Float32Array(cols * rows);
  const sumA = new Float32Array(cols * rows);
  const count = new Uint32Array(cols * rows);
  for (let y = 0; y < SH; y++) {
    const cy = (y / CELL) | 0;
    for (let x = 0; x < SW; x++) {
      const ci = cy * cols + ((x / CELL) | 0);
      const i = y * SW + x;
      sumL[ci] += lum[i];
      sumA[ci] += alpha[i];
      count[ci]++;
    }
  }

  // 4 — draw dots into the 4× output canvas (transparent background).
  canvas.width = SW * OUTPUT_SCALE;
  canvas.height = SH * OUTPUT_SCALE;
  const octx = canvas.getContext("2d");
  if (!octx) throw new Error("no 2d context");
  octx.clearRect(0, 0, canvas.width, canvas.height);
  octx.fillStyle = "#ffffff";
  const maxRadius = ((CELL * OUTPUT_SCALE) / 2) * DOT_FACTOR; // 9.2px at luma=1
  const TAU = Math.PI * 2;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const ci = cy * cols + cx;
      const c = count[ci];
      if (!c) continue;
      if (sumA[ci] / c < ALPHA_MIN) continue; // background / soft edge → no dot
      const l = sumL[ci] / c / 255;
      const radius = Math.pow(l, DOT_GAMMA) * maxRadius;
      if (radius < MIN_RADIUS) continue; // shadows fall away to nothing
      const ox = (cx * CELL + CELL / 2) * OUTPUT_SCALE;
      const oy = (cy * CELL + CELL / 2) * OUTPUT_SCALE;
      octx.beginPath();
      octx.arc(ox, oy, radius, 0, TAU);
      octx.fill();
    }
  }
}

/**
 * Halftone-dot hero portrait. `data-hero-portrait` marks the entrance target so
 * the About hero can drive its fade+rise via `heroTitleIn` (in sync with the
 * nameplate). If the source PNG is missing/undecodable, a clearly-flagged
 * placeholder card stands in instead of crashing.
 */
export function HalftonePortrait() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      try {
        renderHalftone(canvas, img);
      } catch {
        setFailed(true);
      }
    };
    img.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    img.src = SRC;
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    // Sized LARGE on purpose: at the old ~315px the browser downsampled the
    // 1884px dot canvas ~6× and blurred the fine dots into muddy grey. Height-
    // based so it stays a tall, prominent portrait; ~600–680px on desktop keeps
    // the downscale ≲3× so the dots read crisp + bright (like the tuned source).
    <div
      data-hero-portrait
      aria-hidden
      className="relative aspect-[471/530] h-[clamp(20rem,82vmin,48rem)]"
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
        // Fixed-resolution canvas; CSS scales it to the card footprint.
        <canvas ref={canvasRef} className="block h-full w-full" />
      )}
    </div>
  );
}
