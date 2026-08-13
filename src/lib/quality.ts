// -----------------------------------------------------------------------------
// Adaptive render-quality tiers
// -----------------------------------------------------------------------------
// The site's WebGL centerpiece (HeroHead) is heavy: a 50K-tri mesh drawn as both
// a per-pixel lighting "halftone" pass AND ~41K glowing crease-lines, plus a
// particle field, under a full-canvas drop-shadow glow. A modern GPU eats this at
// 60fps; a weak/old integrated GPU stutters.
//
// This module picks ONE quality tier per device so capable machines render the
// FULL fidelity (tier "high" — pixel-identical to before) while genuinely weak
// hardware renders lighter and stays smooth. Nothing here removes an element or
// an animation — only the *cost knobs* change (pixel-ratio, MSAA, particle
// density, the compositor blur-glow), and only on a machine that can't afford the
// full load anyway. A live FPS guard in HeroHead is the runtime safety net on top
// of this one-time static probe.
// -----------------------------------------------------------------------------

export type QualityTier = "high" | "mid" | "low";

export type QualityConfig = {
  /** Upper bound for the R3F pixel ratio (≈ Math.min(devicePixelRatio, maxDpr)). */
  maxDpr: number;
  /** Floor the live FPS guard may drop the pixel ratio to. */
  minDpr: number;
  /** MSAA. Fixed at Canvas creation (can't toggle live) — off on the weakest tier
   *  since MSAA is a real fillrate cost on integrated GPUs. */
  antialias: boolean;
  /** Multiplier on the background particle-field grid (1 = full count). */
  particleScale: number;
  /** Apply the canvas-level drop-shadow bloom (a per-frame full-canvas blur —
   *  the single most expensive compositor op on weak GPUs). */
  glow: boolean;
};

export const QUALITY: Record<QualityTier, QualityConfig> = {
  // Capable hardware — the established look, unchanged. minDpr 1 keeps it crisp:
  // a machine that never drops frames renders exactly as before.
  high: { maxDpr: 2, minDpr: 1, antialias: true, particleScale: 1, glow: true },
  // Mid hardware — trims the top of the pixel-ratio range and thins the (already
  // subtle) particle field. MSAA + glow kept, so it reads the same at a glance.
  // The guard may dip slightly below CSS resolution (0.85) only if it still stutters.
  mid: { maxDpr: 1.5, minDpr: 0.85, antialias: true, particleScale: 0.65, glow: true },
  // Weak hardware — render at CSS pixels, MSAA off, sparse particles, and drop the
  // full-canvas blur-glow. Every element is still present, just cheap to draw; the
  // guard can drop to 0.6× as a last resort to hold a smooth frame rate.
  low: { maxDpr: 1, minDpr: 0.6, antialias: false, particleScale: 0.4, glow: false },
};

/** Below-45fps threshold the live guard uses to step the pixel ratio down. */
export const FPS_FLOOR = 45;

/**
 * Read the unmasked GPU renderer string from a throwaway WebGL context (lower-
 * cased), or "" if unavailable. Used only to spot software rasterizers and the
 * weakest integrated parts. The temp context is released immediately.
 */
function readRendererString(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const raw = dbg
      ? (gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string)
      : gl.getParameter(gl.RENDERER);
    // Free the context slot right away — we only needed the string.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return (raw || "").toLowerCase();
  } catch {
    return "";
  }
}

// Memoize the client result: the probe (a throwaway WebGL context + navigator
// reads) is identical for the whole session, and the page has several callers
// (every HeroHead + the root tier marker). Computed once, reused thereafter.
let cachedTier: QualityTier | null = null;

/**
 * Pick a quality tier from device signals. Conservative: defaults to "high" and
 * only demotes on a CLEAR weak signal, so real machines are never needlessly
 * downgraded. SSR-safe (returns "high" with no `navigator`, and does NOT cache so
 * the client still computes the real tier after hydration).
 */
export function detectQualityTier(): QualityTier {
  if (cachedTier) return cachedTier;
  if (typeof navigator === "undefined") return "high";

  const cores = navigator.hardwareConcurrency ?? 8;
  // deviceMemory (GiB) is Chromium-only; undefined elsewhere → treated as unknown.
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const gpu = readRendererString();

  // Older low-end integrated Intel parts (pre-Iris HD/UHD, GMA) — mid, not low.
  const weakIntel = /intel/.test(gpu) && /(gma|hd graphics (2|3|4|5)0{2}|uhd graphics 6)/.test(gpu);

  let result: QualityTier;
  if (/swiftshader|llvmpipe|software|basic render|microsoft basic/.test(gpu)) {
    result = "low"; // software rasterizer (no real GPU) — always the weakest tier
  } else if (cores <= 2 || (mem !== undefined && mem <= 2)) {
    result = "low"; // very constrained hardware
  } else if (cores <= 4 || (mem !== undefined && mem <= 4) || weakIntel) {
    result = "mid";
  } else {
    result = "high";
  }

  cachedTier = result;
  return result;
}
