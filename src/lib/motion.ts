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
  achievePixel: "steps(7)", // Achievements pixelated top→bottom render sweep
  modalPop: "back.out(1.6)", // Achievement modal zoom-up
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
  achieveIntro: 0.5, // Achievements grid cell punch-in
  achieveIdle: 3.2, // Achievements idle-warp half-cycle (sine yoyo)
  modalPanel: 0.4, // Achievement modal zoom-up
  modalReveal: 0.6, // Achievement modal pixelated image reveal
} as const;

/** Resting opacity of the Projects background polyhedron (ambient, not focal). */
export const BG_SHAPE_OPACITY = 0.45;

/**
 * Achievements grid — pan/warp + idle-drift tuning. Kept together so the whole
 * "liquid grid" feel can be re-tuned in one place. `panFactor` scales raw input
 * deltas into translate px; `panLerp` is the per-frame easing toward the target
 * (gives the inertial glide + damped stop); `edgeResist` is the rubber-band
 * compression applied to motion past a boundary; `skewScale`/`skewMax` turn
 * pan velocity into a bounded rubber-sheet shear; the `idle*` values drive the
 * ambient "alive" ripple. All consumed by the achievements* helpers below.
 */
export const ACHIEVE = {
  panFactor: 1, // input delta (px) → grid translate (px)
  panLerp: 0.12, // ease toward target per frame (inertia + damped stop)
  edgeResist: 0.32, // rubber-band compression when panned past a bound
  edgePad: 40, // extra px of pan slack beyond the exact edge
  // Converge-warp: while panning, the whole grid shrinks slightly toward its
  // center (proportional to pan speed) and springs back to 1 at rest — reads as
  // the screen "warping back" to scroll. Replaces the old left/right skew.
  convergeScale: 0.0034, // pan speed (px/frame) → grid shrink amount
  convergeMax: 0.2, // max shrink (scale floor = 1 − this) — dramatic pull-back
  idleAmp: 10, // idle-warp vertical drift (px) — subtle but perceptible
  idleRotate: 2.6, // idle-warp rotation (deg)
  // Ambient idle auto-scroll: after a short pause with no input, the board
  // slowly drifts vertically (ping-ponging between its bounds) so the page is
  // never fully static — a gentle "slow scroll" tour of the sections.
  idleScrollFrames: 90, // frames of no input before auto-scroll begins (~1.5s)
  idleScrollSpeed: 0.35, // px/frame drift (~21px/s) — slow and calm
  // Pixelated top→bottom intro sweep.
  introSweep: 0.85, // total top-to-bottom stagger spread (s)
  introJitter: 0.12, // random per-cell delay → chunky "rendering" scatter
  // Opened-card modal.
  pixelBlockEach: 0.004, // per-tile stagger of the modal pixel-block dissolve
  tiltMax: 9, // opened-card mouse-tilt max rotation (deg)
} as const;

/**
 * HeroHead style shift (see `styleShift`). Periodically cross-fades the shared
 * 3D head between its two render styles — wireframe (A) and halftone dot-matrix
 * (B) — on a long hold cycle, separate from the shorter idle pose cross-fade.
 * The crossfade isn't smooth: a few `beat`-length glitch flickers are layered in
 * (steps-eased hops) echoing the site's decode/scramble character.
 */
export const STYLE_SHIFT = {
  hold: 8, // seconds holding each style before swapping
  beat: 0.1, // per glitch-beat duration (a handful ≈ ~0.5s transition window)
} as const;

/**
 * Text-scramble / decode effect (see ScrambleText + `scrambleText`). Characters
 * cycle through random glyphs and lock in left-to-right. `duration` is the reveal
 * speed per element; `sweep` is the fraction of the timeline the L→R lock points
 * span; `jitter` is the random per-character offset around that sweep so the
 * lock-in isn't mechanically uniform; `glyphFps` throttles how often unlocked
 * glyphs re-randomize. Character sets are case-matched (a token, not hardcoded):
 * uppercase originals scramble through `upper`, lowercase through `lower`, digits
 * through `digits`; punctuation/other characters are left as-is (spaces too).
 */
/**
 * Pixel-reveal transition (see PixelReveal + `pixelRevealOut`). A full-screen
 * grid of solid cells covers the page and dissolves top-to-bottom: cells fade
 * opacity to 0 while scaling down, staggered per row with a small random jitter
 * so the sweep line reads organic rather than a straight bar. `targetCell` sizes
 * the grid (cols/rows derived per viewport to keep cells ~square); `initialDelay`
 * / `swapDelay` are the waits before dissolving on first load / after a route
 * commit (so the new content is mounted underneath first).
 */
export const PIXEL_REVEAL = {
  targetCell: 58, // px — target cell size; cols/rows derived from the viewport
  maxCols: 24, // clamp so big screens don't explode the cell count
  minCols: 8,
  rowStagger: 0.04, // per-row base delay of the top→bottom sweep
  jitter: 0.05, // random per-cell start jitter (s)
  cellDuration: 0.4, // per-cell fade + scale-down
  cellScale: 0.35, // scale-down target (part of the "dissolve" read)
  ease: "power2.in",
  initialDelay: 0.15, // wait after first mount before dissolving
  swapDelay: 0.08, // wait after a route commit before dissolving
} as const;

/**
 * Project case-study entry title (see ProjectTitleReveal + `projectTitleReveal`).
 * On arriving at /projects/[slug] the project's name appears HUGE and centered,
 * holds for a beat, then transforms (GSAP Flip, position + scale) into a small,
 * fixed top-left header label that persists for the rest of the page. `fontBig`
 * / `fontSmall` are the two font sizes the shared element morphs between.
 */
export const PROJECT_TITLE = {
  hold: 1.8, // s — big centered title holds before shrinking (tune by feel)
  flipDuration: 0.9, // s — big → small shared-element transform
  flipEase: "power4.inOut",
  fontBig: "clamp(3.25rem, 14vw, 12rem)", // huge centered moment
  fontSmall: "1.125rem", // final persistent top-left header size
} as const;

/**
 * Scroll-scrubbed pixelated hero window (see ProjectCaseStudy + `pixelScrubReveal`).
 * A fine grid of cells covers the case-study hero image; clarity is scrubbed to
 * the pinned scroll progress as a tent (covered → clear at center → covered).
 * `cols` sets the density (rows derived from the window aspect); `jitter` is the
 * random per-cell offset around the top→bottom sweep line so it reads organic;
 * `band` is the smoothing width over which a cell clears; `cellScale` is the
 * shrink applied as a cell clears (dissolve read); `runway` is the pinned scroll
 * distance (pin starts when the window centers).
 */
export const PIXEL_SCRUB = {
  cols: 36,
  jitter: 0.3,
  band: 0.16,
  cellScale: 0.4,
  runway: "+=120%",
} as const;

/**
 * Gallery zoom-in reveal (see ProjectCaseStudy + `galleryZoomIn`). Each image
 * starts slightly smaller and grows to rest as it scrolls in (reads as zooming
 * toward rest, not away), then its caption fades up once the zoom settles.
 */
export const GALLERY = {
  scaleFrom: 0.9,
  duration: 0.9,
  ease: "power3.out",
  capDuration: 0.4,
} as const;

export const SCRAMBLE = {
  duration: 0.6, // total scramble time per element
  sweep: 0.65, // fraction of the timeline the L→R lock sweep spans (0..1)
  jitter: 0.22, // random per-character lock jitter
  glyphFps: 26, // unlocked-glyph re-randomize rate (throttled below 60fps)
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
} as const;

/** Stagger values in seconds. */
export const STAGGER = {
  nav: 0.075, // 0.05–0.1s
  boot: 0.02, // 0.02s (used with {from:"random"})
  heroTitle: 0.175, // 0.15–0.2s
  reveal: 0.09, // 0.08–0.1s
  thumb: 0.05, // 0.05s
  badge: 0.05, // 0.05s per chip
  achieveIntro: 0.035, // Achievements grid punch-in, radiating from center
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
  gallery: "top 82%", // Case-study gallery image zoom-in
} as const;

/** Opacity levels that recur across the spec. */
export const OPACITY = {
  ghostPeak: 0.06, // About ghost-text max opacity
} as const;

export type Ease = (typeof EASE)[keyof typeof EASE];
