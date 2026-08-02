// -----------------------------------------------------------------------------
// Reusable animation utilities
// -----------------------------------------------------------------------------
// A library of small, composable helpers — one per row of the motion spec. Each
// returns a GSAP Tween / Timeline / ScrollTrigger so callers can pause, reverse,
// add to a parent timeline, or kill it on cleanup.
//
// Design rules:
//   • Helpers accept `gsap.TweenTarget` (a selector string, element, or array),
//     so they work equally well inside a `useGSAP` scope or standalone.
//   • They never register plugins themselves — that is centralized in ./gsap.
//   • They pull all timings/eases from ./motion so behavior stays consistent.
//   • They respect `prefers-reduced-motion`: when set, tweens resolve to the end
//     state instantly instead of animating.
// -----------------------------------------------------------------------------

import { gsap, ScrollTrigger, Observer } from "@/lib/gsap";
import { ACHIEVE, DURATION, EASE, OPACITY, SCRUB, STAGGER, START } from "@/lib/motion";

type Target = gsap.TweenTarget;
type Vars = gsap.TweenVars;

/** True when the user has asked the OS to minimize non-essential motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// -----------------------------------------------------------------------------
// Load / intro
// -----------------------------------------------------------------------------

/**
 * Boot preloader cells — cells fade in at random with a tight random stagger,
 * per spec (opacity 0→1, power1.inOut, 0.02s random stagger). Returns the tween
 * so a caller can chain the site reveal in its `onComplete`.
 */
export function bootPreloaderCells(targets: Target, vars: Vars = {}) {
  if (prefersReducedMotion()) return gsap.set(targets, { opacity: 1 });
  return gsap.fromTo(
    targets,
    { opacity: 0 },
    {
      opacity: 1,
      duration: gsap.utils.random(2.5, 4, 0.1),
      ease: EASE.boot,
      stagger: { each: STAGGER.boot, from: "random" },
      ...vars,
    },
  );
}

/**
 * Nav / nameplate intro — opacity 0→1 with a short vertical settle. `y` defaults
 * to 20 (from below); pass a negative value (e.g. -8) for elements dropping in.
 */
export function navIntro(targets: Target, y = 20, vars: Vars = {}) {
  if (prefersReducedMotion()) return gsap.set(targets, { opacity: 1, y: 0 });
  return gsap.fromTo(
    targets,
    { opacity: 0, y },
    {
      opacity: 1,
      y: 0,
      duration: DURATION.navIntro,
      ease: EASE.navIntro,
      stagger: STAGGER.nav,
      ...vars,
    },
  );
}

/**
 * Detail hero title in — bigger, slower fade + rise used on route enter
 * (opacity 0→1, y 40→0, power4.out, staggered lines/words).
 */
export function heroTitleIn(targets: Target, vars: Vars = {}) {
  if (prefersReducedMotion()) return gsap.set(targets, { opacity: 1, y: 0 });
  return gsap.fromTo(
    targets,
    { opacity: 0, y: 40 },
    {
      opacity: 1,
      y: 0,
      duration: DURATION.heroTitle,
      ease: EASE.heroTitle,
      stagger: STAGGER.heroTitle,
      ...vars,
    },
  );
}

// -----------------------------------------------------------------------------
// Loops (idle / ambient)
// -----------------------------------------------------------------------------

/**
 * Hero head idle pose swap — crossfades between two stacked layers on a hold →
 * fade → hold loop. Returns the repeating timeline.
 */
export function idlePoseSwap(from: Target, to: Target) {
  const tl = gsap.timeline({ repeat: -1, repeatDelay: DURATION.crossfadeHold });
  if (prefersReducedMotion()) return tl;
  tl.to(from, { opacity: 0, duration: DURATION.crossfade, ease: EASE.crossfade }, 0)
    .to(to, { opacity: 1, duration: DURATION.crossfade, ease: EASE.crossfade }, 0)
    .to(from, { opacity: 1, duration: DURATION.crossfade, ease: EASE.crossfade }, "+=" + DURATION.crossfadeHold)
    .to(to, { opacity: 0, duration: DURATION.crossfade, ease: EASE.crossfade }, "<");
  return tl;
}

// -----------------------------------------------------------------------------
// Pointer-driven (continuous)
// -----------------------------------------------------------------------------

/**
 * Hero head pointer tilt — the head rotates to "look toward" the cursor.
 * Horizontal mouse position maps to Y-axis rotation, vertical to X-axis, within
 * a small, restrained range so it reads as subtle tracking rather than spinning.
 *
 * The raw pointer position is NOT applied directly: a target angle is stored on
 * mousemove, and a per-frame loop (GSAP's ticker — the shared rAF) eases the
 * applied angle toward that target by `lerp` each frame, so the head lags and
 * glides toward the cursor instead of snapping.
 *
 * Fallbacks, per spec:
 *   • No fine pointer (touch / coarse) → neutral, no listener, no loop.
 *   • prefers-reduced-motion → neutral, no listener, no loop.
 * When the cursor holds still the target stops changing, so the head settles and
 * stops — there is no idle drift or fake auto-movement.
 *
 * Output sink (unchanged damping, just where the smoothed values go):
 *   • Pass a DOM `target` to apply the eased angle as a CSS 3D rotation (the
 *     original behavior).
 *   • Pass `onUpdate` to also receive the eased (rotX, rotY) in DEGREES each
 *     frame — this is how the R3F head consumes the exact same smoothed values
 *     and applies them to a Three.js object's rotation instead.
 *   • `target` may be `null` to drive `onUpdate` only (no DOM element involved).
 *
 * Returns a cleanup function that removes the listener and the ticker callback;
 * hand it back from your `useGSAP`/effect so it runs on unmount.
 */
export function headPointerTilt(
  target: Target | null,
  {
    maxDeg = 12,
    lerp = 0.08,
    onUpdate,
  }: {
    maxDeg?: number;
    lerp?: number;
    onUpdate?: (rotX: number, rotY: number) => void;
  } = {},
) {
  const noop = () => {};

  // quickSetter is the cheap path for high-frequency writes (no tween churn).
  // Only created when there's a DOM target to write to.
  const setRotX = target ? gsap.quickSetter(target, "rotationX", "deg") : null;
  const setRotY = target ? gsap.quickSetter(target, "rotationY", "deg") : null;

  // Single place the eased angle is emitted — to the DOM and/or the callback.
  const apply = (rotX: number, rotY: number) => {
    setRotX?.(rotX);
    setRotY?.(rotY);
    onUpdate?.(rotX, rotY);
  };

  // Neutral resting orientation up front — this is also the fallback state.
  // transformPerspective gives the CSS rotation real 3D depth (DOM target only).
  if (target) gsap.set(target, { rotationX: 0, rotationY: 0, transformPerspective: 600 });
  apply(0, 0);

  const hasFinePointer =
    typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
  if (prefersReducedMotion() || !hasFinePointer) return noop;

  const goal = { x: 0, y: 0 }; // where the cursor wants the head
  const current = { x: 0, y: 0 }; // where the head actually is (eased)

  const onMove = (e: MouseEvent) => {
    // Normalize pointer to -1..1 around the viewport center.
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    goal.y = nx * maxDeg; // mouse left/right → turn head left/right
    goal.x = ny * maxDeg; // mouse up/down → tilt head up/down
  };

  const update = () => {
    // Frame-wise damping: move a fraction of the remaining distance each tick.
    current.x += (goal.x - current.x) * lerp;
    current.y += (goal.y - current.y) * lerp;
    apply(current.x, current.y);
  };

  window.addEventListener("mousemove", onMove);
  gsap.ticker.add(update);

  return () => {
    window.removeEventListener("mousemove", onMove);
    gsap.ticker.remove(update);
  };
}

/**
 * About ghost-text cycle — barely-there text pulses to ~6% opacity and back on a
 * long, gentle sine loop (opacity 0→0.06→0).
 */
export function ghostTextCycle(targets: Target) {
  if (prefersReducedMotion()) return gsap.timeline();
  return gsap
    .timeline({ repeat: -1 })
    .to(targets, { opacity: OPACITY.ghostPeak, duration: DURATION.ghostFade, ease: EASE.ghost })
    .to(targets, { opacity: 0, duration: DURATION.ghostFade, ease: EASE.ghost }, `+=${DURATION.ghostHold}`);
}

/**
 * Floating prop loop — small decorative elements drift gently up and down
 * forever (y ±distance, sine in/out, ghost-cycle period). A stagger offsets each
 * target so a group of props never bobs in unison. Reduced motion: static.
 */
export function floatLoop(targets: Target, distance = 8) {
  if (prefersReducedMotion()) return gsap.timeline();
  return gsap.to(targets, {
    y: `-=${distance}`,
    duration: DURATION.ghostHold,
    ease: EASE.ghost,
    yoyo: true,
    repeat: -1,
    stagger: 0.6,
  });
}

/**
 * Scroll indicator — a looping scaleY "pulse". Pair with `fadeOutOnScroll` below
 * so it disappears once the user starts scrolling.
 */
export function scrollIndicatorLoop(target: Target) {
  if (prefersReducedMotion()) return gsap.timeline();
  return gsap.to(target, {
    scaleY: 0.4,
    transformOrigin: "top center",
    duration: DURATION.indicatorLoop,
    ease: EASE.boot,
    repeat: -1,
    yoyo: true,
  });
}

// -----------------------------------------------------------------------------
// Scroll-triggered (one-shot reveals)
// -----------------------------------------------------------------------------

/**
 * Generic one-shot reveal used by Overview title/meta (opacity 0→1 with a y or x
 * offset settling to 0). `toggleActions` keeps it a one-shot: play on enter,
 * never reverse. Pass `{ x }` for horizontal meta, `{ y }` for vertical titles.
 */
export function scrollReveal(
  targets: Target,
  offset: { x?: number; y?: number } = { y: 24 },
  start: string = START.overview,
) {
  if (prefersReducedMotion()) return gsap.set(targets, { opacity: 1, x: 0, y: 0 });
  return gsap.fromTo(
    targets,
    { opacity: 0, x: offset.x ?? 0, y: offset.y ?? 0 },
    {
      opacity: 1,
      x: 0,
      y: 0,
      duration: DURATION.reveal,
      ease: EASE.reveal,
      stagger: STAGGER.reveal,
      scrollTrigger: { trigger: targets as gsap.DOMTarget, start, toggleActions: "play none none none" },
    },
  );
}

/**
 * Photo strip reveal — wipes in via clip-path inset (100% → 0) while fading up.
 * One-shot at 90% viewport.
 */
export function photoStripReveal(targets: Target, start: string = START.photoStrip) {
  if (prefersReducedMotion())
    return gsap.set(targets, { opacity: 1, clipPath: "inset(0% 0% 0% 0%)" });
  return gsap.fromTo(
    targets,
    { opacity: 0, clipPath: "inset(100% 0% 0% 0%)" },
    {
      opacity: 1,
      clipPath: "inset(0% 0% 0% 0%)",
      duration: DURATION.photoStrip,
      ease: EASE.reveal,
      scrollTrigger: { trigger: targets as gsap.DOMTarget, start, toggleActions: "play none none none" },
    },
  );
}

/**
 * Fade an element out the first time the user scrolls past a point — used for the
 * scroll indicator's exit (opacity 1→0). Returns the ScrollTrigger.
 */
export function fadeOutOnScroll(target: Target, start = "top top-=50") {
  return ScrollTrigger.create({
    start,
    once: true,
    onEnter: () =>
      gsap.to(target, { opacity: 0, duration: DURATION.indicatorExit, ease: EASE.boot }),
  });
}

// -----------------------------------------------------------------------------
// Scroll-triggered (scrub — tied to scroll position)
// -----------------------------------------------------------------------------

/** Marquee row colors — dimmed resting state vs. bright active state. */
export const MARQUEE_DIM = { color: "#6b7280", opacity: 0.35 }; // gray-500
export const MARQUEE_BRIGHT = { color: "#ffffff", opacity: 1 };

/**
 * Projects marquee row focus — a row brightens (gray→white) as it scrolls into
 * the viewport-center "active zone" and dims again as it leaves, all scrubbed to
 * scroll (no hard switch). The timeline is in → hold → out, so with scrub the
 * bright plateau sits at the middle of the row's passage across the viewport.
 *
 * Under prefers-reduced-motion the row is simply set bright and stays there
 * (no scrub-tied dimming), per spec.
 */
export function marqueeRowFocus(row: Target, trigger?: gsap.DOMTarget) {
  if (prefersReducedMotion()) return gsap.set(row, MARQUEE_BRIGHT);
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: (trigger ?? row) as gsap.DOMTarget,
      start: "top 80%", // row's top enters lower viewport → begin brightening
      end: "bottom 20%", // row's bottom leaves upper viewport → fully dimmed
      scrub: SCRUB.marquee,
    },
  });
  // Durations act as proportions under scrub: 30% in, 40% bright hold, 30% out.
  tl.fromTo(row, MARQUEE_DIM, {
    ...MARQUEE_BRIGHT,
    duration: DURATION.marqueeRow,
    ease: EASE.marquee,
  })
    .to(row, {
      ...MARQUEE_DIM,
      duration: DURATION.marqueeRow,
      ease: EASE.marquee,
    }, `+=${DURATION.marqueeRow * 1.33}`);
  return tl;
}

/**
 * Detail hero exit parallax — as the hero scrolls away it drifts up, shrinks
 * slightly and fades (y 0→-40, scale 1→0.96, opacity 1→0). Linear, scrubbed,
 * pinned. Returns the tween carrying its ScrollTrigger.
 */
export function heroExitParallax(target: Target, pin?: gsap.DOMTarget) {
  if (prefersReducedMotion()) return gsap.timeline();
  return gsap.to(target, {
    y: -40,
    scale: 0.96,
    opacity: 0,
    ease: EASE.linear,
    scrollTrigger: {
      trigger: (pin ?? target) as gsap.DOMTarget,
      start: "top top",
      end: "bottom top",
      scrub: SCRUB.heroParallax,
      pin,
    },
  });
}

/**
 * Playground column parallax — each column scrolls at its own speed via
 * `yPercent`. `speed` > 0 lags behind, < 0 leads. Linear scrub, no pin.
 */
export function columnParallax(column: Target, speed: number) {
  if (prefersReducedMotion()) return gsap.timeline();
  return gsap.to(column, {
    yPercent: -speed * 100,
    ease: EASE.linear,
    scrollTrigger: {
      trigger: column as gsap.DOMTarget,
      start: "top bottom",
      end: "bottom top",
      scrub: SCRUB.playgroundParallax,
    },
  });
}

// -----------------------------------------------------------------------------
// State-change (active row / active thumbnail)
// -----------------------------------------------------------------------------

/**
 * Thumbnail rail swap — vertical crossfade between an outgoing and incoming
 * thumbnail when the active marquee row changes (y ±20, opacity 0↔1).
 */
export function thumbRailSwap(outgoing: Target, incoming: Target) {
  const tl = gsap.timeline();
  tl.to(outgoing, { y: -20, opacity: 0, duration: DURATION.thumbSwap, ease: EASE.thumbOut }, 0).fromTo(
    incoming,
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: DURATION.thumbSwap, ease: EASE.thumbIn, stagger: STAGGER.thumb },
    0,
  );
  return tl;
}

/**
 * Awards row activation — a row goes gray→white when it enters ~55% viewport.
 * One-shot per row via `onEnter`.
 */
export function awardRowActivate(row: Target, start: string = START.awardsRow) {
  return ScrollTrigger.create({
    trigger: row as gsap.DOMTarget,
    start,
    once: true,
    onEnter: () =>
      gsap.fromTo(
        row,
        { color: "#6b7280", opacity: 0.4 },
        { color: "#ffffff", opacity: 1, duration: DURATION.awardRow, ease: EASE.marquee },
      ),
  });
}

/**
 * Award badge chip fill — chips flip from transparent to a blue fill with a text
 * color swap when their row activates (staggered per chip).
 */
export function awardBadgeFill(chips: Target) {
  return gsap.to(chips, {
    backgroundColor: "#2563eb", // blue-600
    color: "#ffffff",
    duration: DURATION.badgeFill,
    ease: EASE.marquee,
    stagger: STAGGER.badge,
  });
}

/**
 * Award thumbnail card swap — rotate/x/opacity crossfade for a stacked thumbnail
 * when the active award row changes. Uses a back.out overshoot on the incoming
 * card for a snappy "deal the card" feel.
 */
export function awardCardSwap(outgoing: Target, incoming: Target) {
  const tl = gsap.timeline();
  tl.to(outgoing, { rotate: -6, x: -30, opacity: 0, duration: DURATION.cardSwap, ease: EASE.cardSwap }, 0).fromTo(
    incoming,
    { rotate: 8, x: 40, opacity: 0 },
    { rotate: 0, x: 0, opacity: 1, duration: DURATION.cardSwap, ease: EASE.cardSwapBack },
    0.05,
  );
  return tl;
}

/**
 * Playground cell shuffle — a single cell blinks out and back (opacity 1→0→1),
 * with `onSwap` fired at the midpoint so the caller can swap the image source.
 * Callers typically drive these on a ~70–90ms random cadence with a ticker.
 */
export function playgroundCellShuffle(cell: Target, onSwap?: () => void) {
  return gsap
    .timeline()
    .to(cell, { opacity: 0, duration: DURATION.playgroundCell, ease: "steps(3)", onComplete: onSwap })
    .to(cell, { opacity: 1, duration: DURATION.playgroundCell, ease: "power1.out" });
}

// -----------------------------------------------------------------------------
// Route transition
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Achievements grid — intro / idle warp / pan warp
// -----------------------------------------------------------------------------
// These power the /achievements route's "liquid" certificate grid. They target
// plain DOM cells (no WebGL) and, like every helper here, honor reduced motion.

/**
 * Achievements grid intro — a pixelated top-to-bottom "render" sweep. Each card
 * wipes in from its own top edge (clip-path inset bottom 100%→0) with a stepped
 * ease, and the per-card delay scales with the card's vertical position plus a
 * small random jitter — so the grid renders in top-to-bottom in chunky, scan-
 * line fashion rather than a clean line. Reduced motion: cards are simply shown.
 */
export function achievementsGridIntro(cells: Target) {
  const arr = gsap.utils.toArray<HTMLElement>(cells);
  if (!arr.length) return gsap.timeline();
  if (prefersReducedMotion())
    return gsap.set(arr, { opacity: 1, clipPath: "inset(0% 0% 0% 0%)" });

  const tops = arr.map((el) => el.offsetTop);
  const maxTop = Math.max(...tops, 1);
  return gsap.fromTo(
    arr,
    { opacity: 0, clipPath: "inset(0% 0% 100% 0%)" },
    {
      opacity: 1,
      clipPath: "inset(0% 0% 0% 0%)",
      duration: DURATION.achieveIntro,
      ease: EASE.achievePixel,
      // Delay = vertical position (top→bottom) + random scatter → pixelated feel.
      stagger: (i) =>
        (tops[i] / maxTop) * ACHIEVE.introSweep + Math.random() * ACHIEVE.introJitter,
    },
  );
}

/**
 * Achievements idle warp — a continuous, low-amplitude "breathing" ripple so the
 * grid never sits perfectly still. A random-origin stagger with a long per-cell
 * offset means only a handful of cells are ever mid-motion at once. Drifts `y`
 * and `rotation` only (NOT scale) so it never fights the intro's scale or the
 * CSS hover scale on the inner card. Reduced motion: no-op (grid stays static).
 */
export function achievementsIdleWarp(cells: Target) {
  if (prefersReducedMotion()) return gsap.timeline();
  return gsap.to(cells, {
    y: `+=${ACHIEVE.idleAmp}`,
    rotation: ACHIEVE.idleRotate,
    duration: DURATION.achieveIdle,
    ease: EASE.ghost, // sine.inOut — the site's gentle ambient curve
    yoyo: true,
    repeat: -1,
    stagger: { each: 0.25, from: "random" },
  });
}

/**
 * Achievements pan warp — free 2D panning of `grid` inside `viewport`, driven by
 * GSAP's Observer (wheel / trackpad / drag). The grid glides toward a target
 * position with per-frame easing (inertia + a damped stop), rubber-bands past
 * its bounds and springs back, and converges (scales slightly toward its center)
 * in proportion to pan speed, relaxing to scale 1 as motion decays.
 *
 * `grid` is expected to be centered via xPercent/yPercent -50; we only drive its
 * `x`/`y`/`scale`. `getBounds()` returns the max +/- translate on each axis
 * (recomputed live so it tracks resizes). Returns a cleanup that kills the
 * Observer and detaches the ticker.
 *
 * Reduced motion: panning still works (core navigation preserved) but snaps
 * directly to the target with hard bounds — no inertia, no rubber-band, no scale.
 */
export function achievementsPanWarp(
  viewport: HTMLElement,
  grid: HTMLElement,
  getBounds: () => { maxX: number; maxY: number },
): () => void {
  const reduce = prefersReducedMotion();

  // px/py = current (rendered) offset, tx/ty = target the input is steering to.
  // Open at the board's TOP-LEFT corner (+maxX moves the board right so the left
  // section labels are on-screen; +maxY moves it down so the first section sits
  // at the top, its title tucked just under the fixed navbar). One gsap.set here
  // avoids a one-frame flash at center before the ticker takes over.
  const init = getBounds();
  const s = { px: init.maxX, py: init.maxY, tx: init.maxX, ty: init.maxY };
  gsap.set(grid, { x: s.px, y: s.py });

  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
  // Rubber-band: motion past a bound is compressed, not blocked. Under reduced
  // motion we hard-clamp instead (no elastic overshoot).
  const rubber = (v: number, m: number) => {
    if (reduce) return clamp(v, m);
    if (v > m) return m + (v - m) * ACHIEVE.edgeResist;
    if (v < -m) return -m + (v + m) * ACHIEVE.edgeResist;
    return v;
  };
  const applyBounds = (hard: boolean) => {
    const { maxX, maxY } = getBounds();
    s.tx = hard ? clamp(s.tx, maxX) : rubber(s.tx, maxX);
    s.ty = hard ? clamp(s.ty, maxY) : rubber(s.ty, maxY);
  };

  const obs = Observer.create({
    target: viewport,
    type: "wheel,touch,pointer",
    dragMinimum: 2,
    tolerance: 4,
    preventDefault: true,
    // Wheel/trackpad: grid moves OPPOSITE the scroll (content scrolls away).
    onWheel: (self) => {
      s.tx -= self.deltaX * ACHIEVE.panFactor;
      s.ty -= self.deltaY * ACHIEVE.panFactor;
      applyBounds(false);
    },
    // Drag: grid follows the pointer/finger (grab-and-pull).
    onDrag: (self) => {
      s.tx += self.deltaX * ACHIEVE.panFactor;
      s.ty += self.deltaY * ACHIEVE.panFactor;
      applyBounds(false);
    },
    // On release / when input settles, snap the target inside bounds so any
    // rubber-band overshoot springs back.
    onDragEnd: () => applyBounds(true),
    onStop: () => applyBounds(true),
  });

  // One gsap.set per frame (not stacked quickSetters) writes x/y/scale together,
  // and — crucially — preserves the grid's xPercent/yPercent -50 centering,
  // which we never touch. The grid shrinks toward its center in proportion to
  // pan speed (a "converge / warp back" feel) and relaxes to scale 1 as the
  // glide settles to zero velocity.
  const tick = () => {
    const lerp = reduce ? 1 : ACHIEVE.panLerp;
    const nx = s.px + (s.tx - s.px) * lerp;
    const ny = s.py + (s.ty - s.py) * lerp;
    const vx = nx - s.px; // per-frame velocity → drives the converge
    const vy = ny - s.py;
    s.px = nx;
    s.py = ny;
    if (reduce) {
      gsap.set(grid, { x: nx, y: ny });
    } else {
      const speed = Math.hypot(vx, vy);
      const scale = 1 - Math.min(speed * ACHIEVE.convergeScale, ACHIEVE.convergeMax);
      gsap.set(grid, { x: nx, y: ny, scale });
    }
  };
  gsap.ticker.add(tick);

  return () => {
    obs.kill();
    gsap.ticker.remove(tick);
  };
}

/**
 * Achievement modal open — the backdrop fades in, the panel zooms up from small,
 * and the certificate image "develops" in with a pixelated entry: a stepped
 * top-to-bottom clip wipe while a blur + contrast/brightness boost resolves to
 * normal, so it snaps from chunky/low-res to sharp. Reduced motion: shown flat.
 */
export function achievementModalIn(backdrop: Target, panel: Target, imageBox: Target) {
  if (prefersReducedMotion()) {
    gsap.set(backdrop, { opacity: 1 });
    gsap.set(panel, { opacity: 1, scale: 1 });
    gsap.set(imageBox, { opacity: 1, clipPath: "inset(0% 0% 0% 0%)", filter: "none" });
    return gsap.timeline();
  }
  return gsap
    .timeline()
    .fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: "power2.out" })
    .fromTo(
      panel,
      { opacity: 0, scale: 0.72 },
      { opacity: 1, scale: 1, duration: DURATION.modalPanel, ease: EASE.modalPop },
      0.04,
    )
    .fromTo(
      imageBox,
      { clipPath: "inset(0% 0% 100% 0%)", filter: "blur(10px) contrast(1.8) brightness(1.5)" },
      {
        clipPath: "inset(0% 0% 0% 0%)",
        filter: "blur(0px) contrast(1) brightness(1)",
        duration: DURATION.modalReveal,
        ease: EASE.achievePixel,
      },
      0.14,
    );
}

/**
 * Achievement modal close — quick zoom-down + fade, then `onDone` (the caller
 * unmounts). Reduced motion: unmount immediately.
 */
export function achievementModalOut(backdrop: Target, panel: Target, onDone: () => void) {
  if (prefersReducedMotion()) return onDone();
  gsap
    .timeline({ onComplete: onDone })
    .to(panel, { opacity: 0, scale: 0.85, duration: 0.18, ease: "power2.in" }, 0)
    .to(backdrop, { opacity: 0, duration: 0.2, ease: "power2.in" }, 0);
}

/**
 * Route transition wipe — a full-screen overlay scales in from the bottom
 * (scaleY 0→1), covers the screen, then scales away off the top (1→0). Feed the
 * midpoint (`onCover`) the actual navigation so the new page is behind the cover.
 */
export function routeWipe(overlay: Target, onCover?: () => void) {
  const half = DURATION.wipe / 2;
  return gsap
    .timeline()
    .set(overlay, { transformOrigin: "bottom center", scaleY: 0 })
    .to(overlay, { scaleY: 1, duration: half, ease: EASE.wipe, onComplete: onCover })
    .set(overlay, { transformOrigin: "top center" })
    .to(overlay, { scaleY: 0, duration: half, ease: EASE.wipe });
}
