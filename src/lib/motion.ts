// -----------------------------------------------------------------------------
// Motion design tokens
// -----------------------------------------------------------------------------
// A single, typed vocabulary of durations, easings, staggers and scrub values,
// lifted directly from the motion specification table. Animation helpers and
// components reference these tokens instead of hard-coding magic numbers, so the
// whole site stays consistent and can be re-tuned in one place.
// -----------------------------------------------------------------------------

/** Easing curves, named per the spec's "Easing" column. */
export const EASE = {
  boot: "power1.inOut", // Boot preloader cells / scroll indicator loop
  navIntro: "power3.out", // Nav & nameplate intro
  crossfade: "power2.inOut", // Hero idle pose swap
  marquee: "power2.out", // Projects marquee / awards row / badge fill
  thumbIn: "power2.in", // Thumbnail rail (incoming)
  thumbOut: "power2.out", // Thumbnail rail (outgoing)
  wipe: "power4.inOut", // Route transition wipe overlay
  heroTitle: "power4.out", // Detail hero title in
  reveal: "power3.out", // Overview / photo-strip reveals
  ghost: "sine.inOut", // About ghost-text cycle
  cardSwap: "power3.inOut", // Award thumbnail card swap
  cardSwapBack: "back.out(1.3)", // Award card swap (overshoot variant)
  linear: "none", // Parallax scrubs — must be linear
} as const;

/** Durations in seconds. Ranges from the spec collapse to a sensible default. */
export const DURATION = {
  navIntro: 0.7, // 0.6–0.8s
  crossfade: 0.8, // 0.8s
  crossfadeHold: 5, // 4–6s hold between hero pose swaps
  indicatorLoop: 1.5, // scroll-indicator scaleY loop
  indicatorExit: 0.3, // scroll-indicator fade out
  marqueeRow: 0.45, // 0.4–0.5s
  thumbSwap: 0.375, // 0.35–0.4s
  wipe: 0.75, // 0.6–0.9s total
  heroTitle: 1.0, // 0.9–1.1s
  reveal: 0.65, // 0.6–0.7s
  photoStrip: 0.8, // 0.8s
  ghostHold: 3.5, // 3–4s hold
  ghostFade: 0.8, // 0.8s fade
  awardRow: 0.325, // 0.3–0.35s
  badgeFill: 0.275, // 0.25–0.3s
  cardSwap: 0.55, // 0.5–0.6s
  playgroundCell: 0.15, // 0.1–0.2s per cell
  bgZoom: 0.9, // 0.8–1s — Projects background polyhedron zoom-in
} as const;

/** Resting opacity of the Projects background polyhedron (ambient, not focal). */
export const BG_SHAPE_OPACITY = 0.45;

/** Stagger values in seconds. */
export const STAGGER = {
  nav: 0.075, // 0.05–0.1s
  boot: 0.02, // 0.02s (used with {from:"random"})
  heroTitle: 0.175, // 0.15–0.2s
  reveal: 0.09, // 0.08–0.1s
  thumb: 0.05, // 0.05s
  badge: 0.05, // 0.05s per chip
} as const;

/** ScrollTrigger scrub values (seconds of "catch-up" lag). */
export const SCRUB = {
  marquee: 0.4, // 0.3–0.5
  heroParallax: 0.5,
  playgroundParallax: 0.6,
} as const;

/**
 * Viewport start positions for scroll-triggered reveals, expressed as
 * ScrollTrigger `start` strings ("element top" vs "viewport %").
 */
export const START = {
  overview: "top 85%", // Overview title/meta reveal
  photoStrip: "top 90%", // Photo strip reveal
  awardsRow: "top 55%", // Awards row activation
} as const;

/** Opacity levels that recur across the spec. */
export const OPACITY = {
  ghostPeak: 0.06, // About ghost-text max opacity
} as const;

export type Ease = (typeof EASE)[keyof typeof EASE];
