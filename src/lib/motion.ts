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

/** Resting opacity of the Projects background hypercube (ambient, not focal). */
export const BG_SHAPE_OPACITY = 0.85;

/** Projects background particle-swarm (Tesseract) instance count. Tunable — the
 *  per-frame 4D rotation + stereographic projection runs on the CPU per particle,
 *  so keep it modest (source uses 20k; behind the pinned marquee that's too much).
 *  This is the HIGH-tier count; mid tier renders ~60% of it. */
export const SWARM_COUNT = 9500;

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
  pixelBlockEach: 0.0004, // per-tile stagger of the modal pixel-block dissolve
  // (fine grid → many more tiles, so this is scaled down from the old 0.004 to
  // hold the overall dissolve duration roughly constant)
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
 * Landing intro preloader (see `IntroPreloader` + `introControl`). On the first
 * load of `/`, a full-screen black cover shows the logo centered/large, holds,
 * then shrinks + docks it into the navbar's logo slot (GSAP `Flip.fit`) while the
 * black clears and the hero entrance fires. `hold` is the centered pause; `dock`
 * the shrink-into-navbar; `fade` the black clear; `ease` the dock curve.
 */
export const INTRO = {
  reveal: 0.6, // s — big logo wipes in top→bottom
  hold: 0.5, // s — logo holds before it docks
  dock: 0.85, // s — shrink + travel into the navbar logo
  fade: 0.5, // s — black cover clears (page reveal)
  ease: "power4.inOut", // dock ease (matches the project-title Flip)
} as const;

/**
 * Robot idle arm-breathe (see `armBreathe` + HeroHead's shoulder-pivot vertex
 * displacement). The About/Hero robot is a single fused mesh — no separate arm
 * nodes — so the lower-arm vertices are swung about a fixed shoulder pivot in a
 * slow sine loop by a vertex shader (Path B). This layers on top of the pointer
 * tilt / pose cross-fade / style shift as another independent idle motion; it
 * never moves the icosahedron (no arms) and is disabled under reduced motion.
 * `swayDeg` is the peak shoulder rotation (spec range ~2–4°); `cycle` is one full
 * breathe period; `phaseOffset` desyncs the two arms (fraction of a cycle) so they
 * don't read as mechanically mirrored/identical.
 */
export const ARM_BREATHE = {
  swayDeg: 3.2, // peak lower-arm rotation about the shoulder (±deg)
  cycle: 5.5, // seconds per full breathe cycle (slow, calm)
  phaseOffset: 0.37, // left arm's phase lag vs right, as a fraction of a cycle
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
 * A fine grid of cells covers the case-study hero image. A CLEAR BAND is scrubbed
 * through the window with pinned scroll progress: top→bottom as you scroll down,
 * bottom→top as you scroll up (fully covered at both ends). Only the band clears,
 * so the banner stays mostly hidden behind pixels and only partially peeks through.
 * `cols` sets the density (rows derived from the window aspect); `band` is the
 * clear band's half-height (fraction of the window); `jitter` is the random
 * per-cell offset so the band edge reads organic; `cellScale` is the shrink as a
 * cell clears (dissolve read); `coverScale` (>1) overlaps covered cells so the
 * cover is seamless (no grid gaps showing the image); `runway` is the pinned
 * scroll distance (pin starts when the window centers).
 */
export const PIXEL_SCRUB = {
  cols: 36,
  band: 0.18,
  jitter: 0.14,
  cellScale: 0.4,
  coverScale: 1.06,
  // Pinned scroll distance for the band sweep. Kept snug so the covered/black tail
  // of the sweep + the gap to the Overview below don't force extra dead scrolling.
  runway: "+=60%",
} as const;

/**
 * About intro → description transition (see AboutPage + `aboutCurtainRise`). The
 * portrait screen pins in place while a "curtain" — a jagged panel skyline sitting
 * on TOP of the description content — rises over it, dragging the description up
 * directly behind the panels (no gap). Progress-driven (scrubbed to the pinned
 * scroll distance), like `pixelScrubReveal`.
 *
 * `widths` are the panels' fractions of the viewport width (must sum to 1) — an
 * intentionally UNEVEN split, laid out with flexbox. `heights` are per-panel band
 * fractions → a jagged static skyline. `stagger` gives each panel a small extra
 * rise-lag (fraction of the viewport, eased out to 0 by the end) so they DON'T
 * climb in lockstep — the tops appear unequally as they first rise, then settle
 * flush on the description's top edge. `bandVh` is the band height; `litTo` the
 * lit-face cutoff; `darkPeak` the overlay dimming the still-visible portrait;
 * `runway` the pinned scroll distance. Reduced motion / mobile skip the mechanism.
 */
export const ABOUT_PANEL = {
  // The transition is a "curtain": a jagged panel skyline sits on TOP of the
  // description content, and the whole curtain rises over the pinned portrait
  // screen — so the description is dragged up directly behind the panels (no gap).
  widths: [0.2, 0.2, 0.2, 0.2, 0.2], // equal panel widths (Σ = 1), flex-laid
  heights: [0.68, 1.0, 0.48, 0.9, 0.6], // per-panel height (fraction of band) → jagged skyline (wide spread)
  stagger: [0.0, 0.12, 0.035, 0.15, 0.065], // per-panel rise-lag (fraction of vh), eased to 0 → unequal appearance
  bandVh: 0.42, // panel-band height as a fraction of the viewport
  // Each panel's fill is a lit "building" face down to `litTo`, then PURE BLACK —
  // invisible against the black description below it, so its base blends seamlessly.
  litTo: 0.5, // fraction of panel height that's the lit face before going black
  darkPeak: 0.85, // overlay dimming the still-visible portrait above the rising curtain
  runway: "+=115%", // pinned scroll distance (pin starts when the portrait tops out)
} as const;

/**
 * Liquid-fill button (see LiquidButton + `liquidFillTimeline`/`liquidDroplet`). A
 * cream pill with a black circular arrow badge; on hover/press the badge floods
 * horizontally (width tween, pill corners throughout) to fill the whole button
 * black while the label crossfades dark→white, and a small droplet detaches below
 * the badge and falls. `fill` is the flood duration; `droplet` the detach-fall;
 * `dropFall` how far it drops; `textOff`/`textOn` the label colours (rest → filled).
 */
export const LIQUID = {
  fill: 0.5, // flood expand / retract duration (s)
  ease: "power3.inOut",
  labelFade: 0.32, // label colour crossfade (kept a touch shorter than the flood)
  droplet: 0.38, // droplet detach-and-fall duration (s)
  dropEase: "power1.in",
  dropFall: 16, // px the droplet falls as it fades
  dropOpacity: 0.9, // droplet start opacity
  textOff: "#0a0a0a", // label colour at rest (dark on cream)
  textOn: "#ffffff", // label colour when filled (white on black)
  cream: "#ece7df", // pill background — the site's established light tone
  ink: "#0a0a0a", // badge / fill / droplet colour (black, replacing the ref's orange)
} as const;

/**
 * Gallery zoom-in reveal (see ProjectCaseStudy + `galleryZoomIn`). Each image
 * starts slightly smaller and grows to rest as it scrolls in (reads as zooming
 * toward rest, not away), then its caption fades up once the zoom settles.
 */
export const GALLERY = {
  scaleFrom: 0.85,
  duration: 0.9,
  ease: "power3.out",
  capDuration: 0.4,
} as const;

/**
 * Next-project chain (see NextProjectChain). After the gallery a spacer of
 * `runway` gives breathing room; once you scroll to the end, a fixed bottom-center
 * ring (~ringSize) AUTO-COUNTS 0→100 on its own over `countDuration` (not driven by
 * scroll) and then chains into the next project. Scrolling back up before it
 * completes reverses the count and fades it out.
 */
export const NEXT_PROJECT = {
  runway: "60vh", // spacer breathing room past the content's end
  countDuration: 3.4, // s — auto-count 0→100 once the end is reached
  ringSize: 96, // ring diameter (px)
  ringStroke: 3, // ring stroke width (px)
  fadeIn: 0.12, // progress at which the indicator reaches full opacity
} as const;

/**
 * HeroHead entry/exit scan (see HeroHead + `headScanIn`/`headScanOut`). A world-Y
 * clipping plane sweeps through the model to materialize (top→bottom) / erase
 * (bottom→top) it over `duration`. `margin` is extra world units beyond the model
 * radius so the sweep fully clears it. The rim* tokens size the conservative
 * first-pass glow strip at the sweep line (the advanced stencil/glitch rim is a
 * later pass). Reduced motion skips the scan entirely.
 */
export const HEAD_SCAN = {
  duration: 1.2, // s — entry/exit sweep (spec range 1–1.5s)
  ease: "power2.inOut",
  margin: 0.2, // world units beyond the model radius
  rimWidthFactor: 1.7, // rim strip width = model radius × this
  rimThickness: 0.035, // rim strip world-Y thickness
  rimOpacity: 0.6, // additive rim opacity (first-pass)
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

/**
 * Custom cursor dot — a small white dot that eases toward the real pointer each
 * frame (`cursorChase`), replacing the native cursor on fine-pointer devices.
 */
export const CURSOR = {
  size: 14, // px diameter of the white dot
  ease: 0.4, // per-frame lerp toward the pointer — snappy, tracks closely (1 = exact/no lag)
  idleDelay: 500, // ms of pointer stillness before the dot starts fading out
  fadeOut: 0.06, // per-frame opacity lerp toward 0 once idle (gentle fade)
  fadeIn: 0.25, // per-frame opacity lerp toward 1 on movement (snappy reappear)
} as const;

/**
 * Career timeline connector (see <Career> + `careerLineDraw`). One SVG path —
 * trunk + branches — drawn via stroke-dashoffset scrubbed to scroll position.
 */
export const CAREER = {
  scrub: 0.6, // seconds of scroll catch-up on the line draw
  gap: 10, // px gap between a branch end and its card (never touches)
  stroke: 2, // line stroke width (px)
  color: "#3b82f6", // flat accent blue (matches card underlines / eyebrows)
  start: "top 72%", // draw begins as the section enters
  end: "bottom 60%", // draw completes near the section end (fallback, no last card)
  endAtCard: "center center", // draw completes as the LAST card centers on screen
  node: 3.5, // base junction-node radius (px, dim/unreached)
  nodeFlare: 6, // lit junction-node radius (px, once the draw front passes)
  tip: 5, // radius of the bright leading tip riding the draw front
  branchWindow: 0.16, // progress span over which a branch draws once its node is hit
  nodeWindow: 0.05, // progress span over which a node lights up
} as const;

export type Ease = (typeof EASE)[keyof typeof EASE];
