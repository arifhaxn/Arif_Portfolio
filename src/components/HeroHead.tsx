"use client";

// -----------------------------------------------------------------------------
// HeroHead — React Three Fiber wireframe centerpiece
// -----------------------------------------------------------------------------
// Renders a wireframe shape wired into the two established behaviors:
//
//   • Mouse tilt — `headPointerTilt` computes the damped, lerp-smoothed look-at
//     angle; the eased degrees flow into a ref that `useFrame` copies onto the
//     group's rotation.
//   • Pose cross-fade — `idlePoseSwap` runs its 0.8s / power2.inOut fade on a
//     4–6s hold loop, retargeted at the two materials' opacity. Two overlapping
//     copies at slightly different resting angles crossfade.
//
// Two selectable shapes (the `shape` prop):
//   • "icosahedron" (default) — the lightweight procedural polyhedron (20 tris),
//     dim-gray FULL wireframe: the confirmed Hero/Projects look, untouched.
//   • "robot" — public/robot.glb (50K-tri simplified mesh) rendered as CREASE
//     EDGES via THREE.EdgesGeometry, not a full wireframe. Only edges whose two
//     adjacent faces meet at more than ROBOT_EDGE_ANGLE_DEG are drawn (plus
//     boundary edges), so flat/near-flat triangulation diagonals drop out and
//     curved surfaces read as clean readable facets instead of dense clutter.
//     Drawn as bright additive lines with the same colors + CSS glow as before —
//     only WHICH edges are drawn changed, not the line styling.
//
// Performance / lifecycle:
//   • dpr capped at 2; IntersectionObserver flips frameloop to "never" when the
//     wrapper scrolls out of view; geometries we create are disposed on unmount
//     (R3F disposes materials/renderer; drei's GLTF cache is kept so a remount
//     doesn't re-download/re-parse). EdgesGeometry build is ~180ms, one-time.
//   • Reduced-motion / no-mouse: helpers hold Pose A at rest, no tracking/loop.
// -----------------------------------------------------------------------------

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, useGLTF } from "@react-three/drei";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  EdgesGeometry,
  FrontSide,
  IcosahedronGeometry,
  MathUtils,
  Mesh,
  NormalBlending,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Group,
  type MeshBasicMaterial,
  type Points,
} from "three";
import {
  armBreathe,
  headPointerTilt,
  idlePoseSwap,
  prefersReducedMotion,
  styleShift,
} from "@/lib/animations";
import { ARM_BREATHE } from "@/lib/motion";

// -----------------------------------------------------------------------------
// ▶ ROBOT ARM-BREATHE (Path B) — shoulder-pivot vertex sway for the fused mesh.
// robot.glb is ONE fused mesh (no separate arm nodes, no skin), so the lower-arm
// vertices can't be rotated as a child node. Instead this GLSL swings them about
// a FIXED per-side shoulder pivot in the mesh's local space: a vertex's sway
// weight ramps in past the torso edge in |x| and below the shoulder line in y,
// and the rotation is applied about that pivot — so the shoulder end never moves
// (weight × displacement → 0 there) and the hand swings most. The |x| falloff
// band sits in the empty gap between torso and arm, so there's no visible seam.
// Shared verbatim by the halftone shader (below) and the crease-line materials
// (patched via onBeforeCompile) so both render styles swing identically.
//
// Zone constants are in robot.glb's LOCAL space (derived from a vertex-position
// analysis: arms are |x| ≳ 0.44 in y ≈ 0.2…−0.6; re-derive if the model changes).
// The animated inputs are uniforms: uArmPhase (0..1 loop from `armBreathe`),
// uArmAmp (peak radians; 0 disables — icosahedron / reduced motion), and
// uArmPhaseOffset (left arm's phase lag so the two aren't mirrored/identical).
// -----------------------------------------------------------------------------
const ARM_BREATHE_GLSL = /* glsl */ `
  uniform float uArmPhase;       // 0..1 normalized breathe phase (right arm)
  uniform float uArmAmp;         // peak sway angle, radians (0 = disabled)
  uniform float uArmPhaseOffset; // left arm's phase lag (fraction of a cycle)
  const float ARM_X_INNER = 0.40; // torso edge — below this |x|, no sway
  const float ARM_X_OUTER = 0.52; // fully arm past this |x|
  const float ARM_Y_TOP   = 0.24; // shoulder line — above this y, no sway
  const float ARM_Y_BODY  = 0.05; // fully swung below this y
  const float ARM_PIVOT_X = 0.48; // shoulder-joint |x|
  const float ARM_PIVOT_Y = 0.22; // shoulder-joint y
  vec3 applyArmBreathe(vec3 p) {
    if (uArmAmp <= 0.0) return p;             // disabled: icosahedron / reduced motion
    float side = sign(p.x);                   // -1 left arm, +1 right arm
    float sideW  = smoothstep(ARM_X_INNER, ARM_X_OUTER, abs(p.x));
    float belowW = 1.0 - smoothstep(ARM_Y_BODY, ARM_Y_TOP, p.y);
    float w = sideW * belowW;                 // 0 on torso/head/legs, 1 on the lower arm
    if (w <= 0.0) return p;
    float ph = uArmPhase + (side < 0.0 ? uArmPhaseOffset : 0.0);
    float angle = uArmAmp * sin(ph * 6.2831853);
    vec2 pivot = vec2(ARM_PIVOT_X * side, ARM_PIVOT_Y);
    vec2 rel = p.xy - pivot;                   // pendulum swing in the XY plane
    float s = sin(angle), c = cos(angle);
    vec2 rotated = vec2(c * rel.x - s * rel.y, s * rel.x + c * rel.y);
    p.xy = mix(p.xy, pivot + rotated, w);      // shoulder stays put; hand swings most
    return p;
  }
`;

// Peak sway as radians (the token is authored in degrees for readability).
const ARM_SWAY_RAD = MathUtils.degToRad(ARM_BREATHE.swayDeg);

// -----------------------------------------------------------------------------
// Robot crease-line shader (Style A). The crease edges are drawn with an EXPLICIT
// shader material — not lineBasicMaterial — so the exact same `applyArmBreathe`
// vertex displacement as the halftone runs on the lines too (both styles must
// swing in lockstep through the crossfade). The fragment is a flat color × the
// pose-crossfade opacity, matching the old additive line look; `uColor`/`uOpacity`
// replace the old material `color`/`opacity`. Arm uniforms are shared by reference
// with the halftone (see `armUniforms`), so one per-frame write drives both.
// -----------------------------------------------------------------------------
const LINE_VERTEX = /* glsl */ `
  ${ARM_BREATHE_GLSL}
  void main() {
    vec3 armPos = applyArmBreathe(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(armPos, 1.0);
  }
`;
const LINE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    if (uOpacity <= 0.001) discard;
    gl_FragColor = vec4(uColor, uOpacity);
  }
`;

/** Write the Style A pose-crossfade opacity: a uniform for the robot's displacing
 *  line shader (ShaderMaterial), the plain `.opacity` for the wireframe mesh. */
function setPoseOpacity(m: MeshBasicMaterial | ShaderMaterial | null, v: number) {
  if (!m) return;
  if (m instanceof ShaderMaterial) m.uniforms.uOpacity.value = v;
  else m.opacity = v;
}

/** Write the arm-breathe amplitude (radians) + normalized phase to a material that
 *  carries the sway uniforms (the robot's crease-line and halftone shaders). No-op
 *  for anything without them (the icosahedron wireframe has no arm uniforms). */
function writeArmSway(m: MeshBasicMaterial | ShaderMaterial | null, amp: number, phase: number) {
  if (!(m instanceof ShaderMaterial)) return;
  const { uArmAmp, uArmPhase } = m.uniforms;
  if (!uArmAmp || !uArmPhase) return;
  uArmAmp.value = amp;
  uArmPhase.value = phase;
}

// -----------------------------------------------------------------------------
// Halftone (Style B) shader — screen-space dot-matrix of the LIT solid mesh.
// Per fragment we shade the surface (Blinn-Phong: diffuse falloff + a specular
// highlight sweep, from a fixed top-front view-space light) to a luminance, then
// map that luminance to the dot RADIUS on a screen-pixel grid: bright highlight
// facets → big dense dots, shadow → thin to nothing. Strong contrast so the
// tonal range reads like a halftone-of-a-photo, not a flat silhouette. Because
// the normals are in view space, the tone shifts live as the model tilts/spins.
// White dots on transparent; `uOpacity` is driven by the style crossfade.
// -----------------------------------------------------------------------------
const HALFTONE_VERTEX = /* glsl */ `
  varying vec3 vViewNormal;
  varying vec3 vViewPos;
  ${ARM_BREATHE_GLSL}
  void main() {
    // Swing the lower-arm vertices from the shoulder before shading (robot only;
    // a no-op when uArmAmp is 0). Normals are left unrotated — the sway is a few
    // degrees, so the lighting shift is imperceptible.
    vec3 armPos = applyArmBreathe(position);
    vec4 mvPos = modelViewMatrix * vec4(armPos, 1.0);
    vViewPos = mvPos.xyz;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPos;
  }
`;
const HALFTONE_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  uniform float uDotSize;
  uniform vec3 uLightDir;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;
  void main() {
    if (uOpacity <= 0.001) discard;
    vec3 N = normalize(vViewNormal);
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(-vViewPos);        // fragment → camera (view space)
    vec3 H = normalize(L + V);
    float diff = clamp(dot(N, L), 0.0, 1.0);
    float spec = pow(clamp(dot(N, H), 0.0, 1.0), 22.0); // tight highlight sweep
    float lum = diff * 0.95 + spec * 0.75;              // NO ambient — backs stay dark
    // Strong tonal remap, then a STEEP luminance→dot-size curve (lum^2): mid/low
    // luminance falls off fast toward dot size 0, so only genuinely lit surfaces
    // (highlights, the front sweep) show dots; shadow/back regions go sparse/black.
    lum = smoothstep(0.08, 0.9, lum);
    float radius = pow(lum, 2.0) * 1.4; // highlights → full, shadows → ~0
    vec2 cell = mod(gl_FragCoord.xy, uDotSize) / uDotSize - 0.5;
    float dist = length(cell) * 2.0;
    float coverage = 1.0 - smoothstep(radius - 0.08, radius + 0.08, dist);
    coverage *= smoothstep(0.03, 0.12, radius);
    // Opaque form: dots are white, gaps are flat BLACK (not discarded), so nothing
    // behind the front surface bleeds through the negative space between dots. The
    // whole mesh fades via uOpacity for the style crossfade; depthWrite (on the
    // material) makes the nearest front surface self-occlude everything deeper.
    gl_FragColor = vec4(vec3(coverage), uOpacity);
  }
`;

// -----------------------------------------------------------------------------
// Background star-particle field (paired with Style B). A grid of small square
// GL points in loose wave-like rows behind the model. The ambient wave undulates
// them; the pointer (from the same eased tilt signal — zero on touch/reduced, so
// parallax is auto-off there) shifts them for depth. Opacity is driven by the
// style mix, so the field fades in/out with the halftone. Constant screen-size
// squares = pixelated look.
// -----------------------------------------------------------------------------
// Reduced from 46×28 → ~40% of the original floating-pixel count, applied to
// every HeroHead field (landing robot, About robot, Projects icosahedron).
const PARTICLE_COLS = 29;
const PARTICLE_ROWS = 18;
const PARTICLE_W = 15; // world-unit spread — overfills even a full-viewport wide canvas
const PARTICLE_H = 9;

/** Grid of background points with per-point seed + parallax-depth attributes. */
function buildParticleGeometry(): BufferGeometry {
  const pos: number[] = [];
  const seed: number[] = [];
  const depth: number[] = [];
  for (let r = 0; r < PARTICLE_ROWS; r++) {
    for (let c = 0; c < PARTICLE_COLS; c++) {
      pos.push(
        (c / (PARTICLE_COLS - 1) - 0.5) * PARTICLE_W + (Math.random() - 0.5) * 0.18,
        (r / (PARTICLE_ROWS - 1) - 0.5) * PARTICLE_H + (Math.random() - 0.5) * 0.14,
        -2.2 - Math.random() * 1.6, // depth behind the model (~z 0)
      );
      seed.push(Math.random());
      depth.push(Math.random()); // 0..1 parallax + size factor
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("aSeed", new BufferAttribute(new Float32Array(seed), 1));
  g.setAttribute("aDepth", new BufferAttribute(new Float32Array(depth), 1));
  return g;
}

const PARTICLE_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform vec2 uCursor;    // cursor mapped to world XY on the plane (far off when idle)
  uniform float uRepel;    // repulsion strength (world units)
  attribute float aSeed;
  attribute float aDepth;
  varying float vSeed;
  void main() {
    vSeed = aSeed;
    vec3 p = position;
    // slow ambient wave in loose rows
    p.y += sin(p.x * 0.6 + uTime * 0.55 + aSeed * 6.2831) * 0.13;
    p.x += cos(p.y * 0.5 + uTime * 0.4 + aSeed * 6.2831) * 0.07;
    // cursor repulsion — push away from the pointer with a local falloff, so it
    // reads as the cursor repelling the particles.
    vec2 away = p.xy - uCursor;
    float d = length(away);
    float f = max(0.0, 1.0 - d / 1.8);
    f = f * f;
    p.xy += normalize(away + 1e-3) * f * uRepel * (0.6 + aDepth * 0.4);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = 4.0 + aDepth * 6.0; // chunkier → more pixelated squares
  }
`;
const PARTICLE_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying float vSeed;
  void main() {
    if (uOpacity <= 0.001) discard;
    float b = 0.6 + vSeed * 0.4;                          // grayscale, black & white
    gl_FragColor = vec4(vec3(b), uOpacity * (0.14 + vSeed * 0.26)); // subtle
  }
`;

export type HeadShape = "icosahedron" | "robot";

type Euler3 = [number, number, number];

// -----------------------------------------------------------------------------
// ▶ ROBOT CREASE THRESHOLD — the one knob for tuning the robot's facet density.
// Lower = more edges kept (denser, curves well-defined). Higher = fewer edges
// (sparser, only sharp creases). Measured on the 50K mesh (segments / rendered
// pixel-coverage; full wireframe = 26.56% and read as cluttered):
//   10°→48.9K/21.3%   15°→41.2K/17.9%   20°→35.2K/16.1%
//   25°→30.2K/15.2%   30°→25.9K/14.5%   45°→15.9K/12.7%
// 15° keeps enough of the gentle-curve edges to read as facets without returning
// to full-wireframe clutter. To try another value, change this and reload.
// -----------------------------------------------------------------------------
const ROBOT_EDGE_ANGLE_DEG = 15;

// --- Back-facing eye-socket duplicate removal (surgical, tied to THIS mesh) ---
// The head dome is see-through (intentional), so through each front eye ring you
// also see the far/inner dome surface behind it, which carries a duplicate eye
// ring. We drop ONLY those back rings: within a small (x,y) disc at each eye, any
// crease segment on the back half (z < EYE_BACK_Z) is removed. Verified against
// the mesh — at each eye the segments split cleanly into a FRONT rim (z ≈ +0.35..
// +0.40, kept) and a BACK rim (z ≈ -0.35..-0.40, dropped) with NOTHING in between,
// so the cut can't nick the front eye or any other geometry. ~250 segments drop
// per eye. Coordinates are the model's local space (eye centroids ≈ (±0.12, 0.40));
// re-derive with scripts/ if robot.glb is ever replaced.
const EYE_CENTERS: [number, number][] = [
  [-0.12, 0.4],
  [0.12, 0.4],
];
const EYE_RADIUS = 0.09; // (x,y) disc around each eye — covers the ring + margin
const EYE_BACK_Z = 0; // drop the back half of the disc (front rim sits far ahead at z≈+0.37)

/** Return a new line geometry with the back-dome eye duplicates removed. */
function stripEyeBackDuplicates(edges: BufferGeometry): BufferGeometry {
  const src = edges.getAttribute("position").array;
  const kept: number[] = [];
  for (let i = 0; i < src.length; i += 6) {
    const mx = (src[i] + src[i + 3]) / 2;
    const my = (src[i + 1] + src[i + 4]) / 2;
    const mz = (src[i + 2] + src[i + 5]) / 2;
    const inEye = EYE_CENTERS.some(
      ([cx, cy]) => Math.hypot(mx - cx, my - cy) < EYE_RADIUS,
    );
    if (inEye && mz < EYE_BACK_Z) continue; // drop back-dome duplicate at the eye
    for (let k = 0; k < 6; k++) kept.push(src[i + k]);
  }
  const out = new BufferGeometry();
  out.setAttribute("position", new BufferAttribute(new Float32Array(kept), 3));
  return out;
}

// Resting orientations for the two crossfading copies (radians). Pose B is kept
// IDENTICAL to Pose A on purpose: the idle crossfade should only shift the COLOR
// in place, never move/rotate the shape — different poses made it visibly drift
// as the colors swapped. (The polyhedron keeps its tilted 3/4 facet view; the
// robot stands upright — only mouse-tilt + auto-spin move them, not the swap.)
const POLY_POSE_A: Euler3 = [0.2, 0.35, 0];
const POLY_POSE_B: Euler3 = POLY_POSE_A;
const ROBOT_POSE_A: Euler3 = [0, 0, 0];
const ROBOT_POSE_B: Euler3 = ROBOT_POSE_A;

// Normalize every shape to this bounding radius so camera framing (z 2.9,
// fov 45) works for any geometry.
const FIT_RADIUS = 1.1;

// Wireframe treatments. The polyhedron keeps the site's dim-gray look; the robot
// gets the bright additive/glow treatment (unchanged from the full-wireframe
// version — only the edge SET changed to crease edges).
const POLY_STYLE = {
  colorA: "#d4d4d8", // zinc-300
  colorB: "#60a5fa", // blue-400
  additive: false,
  renderAs: "wireframe" as const,
};
const ROBOT_STYLE = {
  // Neutral silver, ~13% dimmer than pure white (on an additive material, scaling
  // the color is equivalent to lowering opacity but survives the crossfade, which
  // drives opacity 0↔1). Both copies share ONE tone: the blue Pose-B variant was
  // removed, so the idle pose-crossfade no longer tints the robot blue.
  colorA: "#dedede",
  colorB: "#dedede",
  additive: true,
  renderAs: "lines" as const,
};

// Canvas-level fake bloom for the robot — a compositor drop-shadow haloes every
// lit pixel. Cost is resolution-dependent only, independent of line count.
const ROBOT_GLOW_CLASS = "[filter:drop-shadow(0_0_6px_rgba(255,255,255,0.30))]";

type Style = {
  colorA: string;
  colorB: string;
  additive: boolean;
  renderAs: "wireframe" | "lines";
};

/**
 * Background particle field — rendered behind the model, faded by the style mix
 * (visible during Style B). `styleMix` is a shared ref; `reduce` freezes motion.
 * The cursor (tracked on window + mapped through the canvas rect so it works even
 * when the canvas is pointer-events-none) REPELS particles locally. Renders first
 * (renderOrder) with no depth test so it always sits behind the head.
 */
const CURSOR_IDLE = 1e4; // parked far off-screen so nothing is repelled when idle

function ParticleField({
  styleMix,
  reduce,
}: {
  styleMix: React.RefObject<{ v: number }>;
  reduce: boolean;
}) {
  const matRef = useRef<ShaderMaterial>(null);
  const pointsRef = useRef<Points>(null);
  const geometry = useMemo(() => buildParticleGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uCursor: { value: new Vector2(CURSOR_IDLE, CURSOR_IDLE) },
      uRepel: { value: 0.95 },
    }),
    [],
  );

  // Raw window cursor (pixels). A window listener works regardless of the canvas'
  // pointer-events; on touch there's no persistent pointer, so it stays parked.
  const cursorPx = useRef({ x: CURSOR_IDLE, y: CURSOR_IDLE });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      cursorPx.current.x = e.clientX;
      cursorPx.current.y = e.clientY;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, delta) => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uOpacity.value = styleMix.current.v; // fade with Style B
    if (reduce) return;
    m.uniforms.uTime.value += delta;
    // Map the window cursor to world XY on the particle plane (~z -3).
    const rect = state.gl.domElement.getBoundingClientRect();
    if (rect.width && cursorPx.current.x < CURSOR_IDLE) {
      const nx = ((cursorPx.current.x - rect.left) / rect.width) * 2 - 1;
      const ny = -(((cursorPx.current.y - rect.top) / rect.height) * 2 - 1);
      const depthFactor = (2.9 + 3.0) / 2.9; // plane distance / z=0 distance
      m.uniforms.uCursor.value.set(
        nx * state.viewport.width * 0.5 * depthFactor,
        ny * state.viewport.height * 0.5 * depthFactor,
      );
    } else {
      m.uniforms.uCursor.value.set(CURSOR_IDLE, CURSOR_IDLE);
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry} renderOrder={-10}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        depthTest={false}
        uniforms={uniforms}
        vertexShader={PARTICLE_VERTEX}
        fragmentShader={PARTICLE_FRAGMENT}
      />
    </points>
  );
}

/**
 * Shared inner renderer: tilt group + the two crossfading pose copies. Shapes
 * supply geometry and a style; "wireframe" draws every triangle edge (right for
 * the low-poly icosahedron), "lines" draws a prebuilt line geometry such as
 * EdgesGeometry (right for the dense robot's crease edges).
 */
function ShapeMeshes({
  geometry,
  solidGeometry,
  scale = 1,
  poseA = POLY_POSE_A,
  poseB = POLY_POSE_B,
  style = POLY_STYLE,
  tilt,
  spin = 0,
  zoom = 1,
  arms = false,
}: {
  /** Style A geometry — line set (robot) or wireframe mesh (icosahedron). */
  geometry: BufferGeometry;
  /** Style B geometry — the SOLID, flat-normal mesh for the halftone pass. */
  solidGeometry: BufferGeometry;
  scale?: number;
  poseA?: Euler3;
  poseB?: Euler3;
  style?: Style;
  tilt: React.RefObject<{ x: number; y: number }>;
  /** Continuous idle spin about Y, in radians/sec (0 = none). */
  spin?: number;
  /** Extra scale multiplier so the model can fill more of its canvas (1 = fit). */
  zoom?: number;
  /** Enable the shoulder-pivot arm-breathe sway (robot only — it has arms). */
  arms?: boolean;
}) {
  const group = useRef<Group>(null);
  // Style A material refs. Robot → ShaderMaterial (crease lines, displacing);
  // icosahedron → MeshBasicMaterial (wireframe). Mutually exclusive at runtime.
  const matA = useRef<MeshBasicMaterial | ShaderMaterial>(null);
  const matB = useRef<MeshBasicMaterial | ShaderMaterial>(null);

  // Accumulated auto-spin angle (radians). Reduced motion disables the spin.
  const spinAngle = useRef(0);
  const reduce = useMemo(() => prefersReducedMotion(), []);

  // Arm-breathe (robot only). `armPhase` is looped 0→1 by the `armBreathe` GSAP
  // tween. `armUniforms` seeds the sway uniforms into each Style-A/B shader's
  // uniforms object (halftone + both crease-line shaders) so the shaders declare
  // and bind them; the per-frame values are then written to EACH material directly
  // (see `writeArmSway`), so all three swing in lockstep without depending on the
  // uniform objects staying shared by reference. uArmPhaseOffset (left-arm desync)
  // is constant; uArmAmp is 0 for the icosahedron / reduced motion (arms static).
  const armPhase = useRef({ phase: 0 });
  const armUniforms = useMemo(
    () => ({
      uArmPhase: { value: 0 }, // 0..1 breathe phase, written each frame
      uArmAmp: { value: 0 }, // peak sway radians; 0 = disabled (poly / reduced)
      uArmPhaseOffset: { value: ARM_BREATHE.phaseOffset }, // left-arm desync
    }),
    [],
  );

  // Pose cross-fade drives these plain values (not the materials directly), so
  // the separate STYLE cross-fade can multiply on top without a GSAP conflict.
  const poseOpA = useRef({ opacity: 1 });
  const poseOpB = useRef({ opacity: 0 });
  // Style mix: 0 = wireframe (A), 1 = halftone (B). Driven by styleShift.
  const styleMix = useRef({ v: 0 });

  // Halftone material ref (mutated each frame for the crossfade) + its stable
  // uniforms object for the JSX.
  const halftoneMat = useRef<ShaderMaterial>(null);
  const halftoneUniforms = useMemo(
    () => ({
      uOpacity: { value: 0 },
      uDotSize: { value: 8 }, // device px per dot cell
      uLightDir: { value: new Vector3(0.2, 0.85, 0.45) }, // view-space, TOP-front
      ...armUniforms, // seed sway uniforms so the halftone shader binds them
    }),
    [armUniforms],
  );

  // Style A crease-line uniforms (robot). Own color + pose-crossfade opacity, plus
  // the arm-sway uniforms (seeded here, written per-frame by `writeArmSway`).
  const lineUniformsA = useMemo(
    () => ({ uColor: { value: new Color(style.colorA) }, uOpacity: { value: 1 }, ...armUniforms }),
    [armUniforms, style.colorA],
  );
  const lineUniformsB = useMemo(
    () => ({ uColor: { value: new Color(style.colorB) }, uOpacity: { value: 0 }, ...armUniforms }),
    [armUniforms, style.colorB],
  );

  // Pose cross-fade (short cycle) + style shift (long cycle) run alongside.
  useEffect(() => {
    const poseTl = idlePoseSwap(poseOpA.current, poseOpB.current);
    const styleTl = styleShift(styleMix.current);
    return () => {
      poseTl.kill();
      styleTl.kill();
    };
  }, []);

  // Drive the breathe phase on the shared GSAP ticker (robot, motion allowed).
  useEffect(() => {
    if (!arms || reduce) return;
    const tw = armBreathe(armPhase.current);
    return () => {
      tw.kill();
    };
  }, [arms, reduce]);

  // Each frame: slow auto-spin + mouse look-at on the group, and the combined
  // pose × style opacity on Style A materials / the halftone opacity on Style B.
  useFrame((_, delta) => {
    if (!group.current) return;
    if (!reduce) spinAngle.current += spin * delta;
    group.current.rotation.x = MathUtils.degToRad(tilt.current.x);
    group.current.rotation.y = MathUtils.degToRad(tilt.current.y) + spinAngle.current;

    const mix = styleMix.current.v;
    const invMix = 1 - mix;
    // Style A pose-crossfade opacity: robot lines carry it as a uniform, the
    // icosahedron wireframe as the material's own `opacity`.
    setPoseOpacity(matA.current, poseOpA.current.opacity * invMix);
    setPoseOpacity(matB.current, poseOpB.current.opacity * invMix);
    if (halftoneMat.current) halftoneMat.current.uniforms.uOpacity.value = mix;

    // Publish the breathe amplitude + phase to EVERY arm-aware material — the two
    // crease-line shaders AND the halftone — writing each material's own uniforms
    // directly (not relying on a shared-reference assumption, which R3F/Three may
    // not preserve per material). This is why both render styles swing in lockstep.
    // Amplitude is 0 for the icosahedron (no arm uniforms → skipped) and under
    // reduced motion, holding the arms static.
    const amp = arms && !reduce ? ARM_SWAY_RAD : 0;
    const phase = armPhase.current.phase;
    writeArmSway(matA.current, amp, phase);
    writeArmSway(matB.current, amp, phase);
    writeArmSway(halftoneMat.current, amp, phase);
  });

  const blending = style.additive ? AdditiveBlending : NormalBlending;

  return (
    <>
      {/* Background particle field (behind the head), faded with the style mix. */}
      <ParticleField styleMix={styleMix} reduce={reduce} />

      <group ref={group}>
      <Center scale={scale * zoom}>
        {/* --- Style B: halftone dot-matrix over the solid mesh. Opaque black
            gaps + depthWrite so only the nearest FrontSide surface shows (no
            back/interior bleed-through); renderOrder 2 draws it after Style A so
            the wireframe below isn't depth-occluded during the crossfade. --- */}
        <mesh geometry={solidGeometry} rotation={poseA} renderOrder={2}>
          <shaderMaterial
            ref={halftoneMat}
            transparent
            depthWrite
            depthTest
            side={FrontSide}
            uniforms={halftoneUniforms}
            vertexShader={HALFTONE_VERTEX}
            fragmentShader={HALFTONE_FRAGMENT}
          />
        </mesh>

        {/* --- Style A: the existing wireframe / crease-line treatment --- */}
        {style.renderAs === "lines" ? (
          <>
            <lineSegments geometry={geometry} rotation={poseA}>
              <shaderMaterial
                ref={matA}
                transparent
                depthWrite={false}
                blending={blending}
                uniforms={lineUniformsA}
                vertexShader={LINE_VERTEX}
                fragmentShader={LINE_FRAGMENT}
              />
            </lineSegments>
            <lineSegments geometry={geometry} rotation={poseB}>
              <shaderMaterial
                ref={matB}
                transparent
                depthWrite={false}
                blending={blending}
                uniforms={lineUniformsB}
                vertexShader={LINE_VERTEX}
                fragmentShader={LINE_FRAGMENT}
              />
            </lineSegments>
          </>
        ) : (
          <>
            <mesh geometry={geometry} rotation={poseA}>
              <meshBasicMaterial
                ref={matA}
                wireframe
                transparent
                opacity={1}
                depthWrite={false}
                blending={blending}
                color={style.colorA}
              />
            </mesh>
            <mesh geometry={geometry} rotation={poseB}>
              <meshBasicMaterial
                ref={matB}
                wireframe
                transparent
                opacity={0}
                depthWrite={false}
                blending={blending}
                color={style.colorB}
              />
            </mesh>
          </>
        )}
      </Center>
      </group>
    </>
  );
}

/** Default lightweight shape — 20-face icosahedron (the confirmed baseline).  */
function PolyShape({
  tilt,
  spin = 0,
  zoom = 1,
}: {
  tilt: React.RefObject<{ x: number; y: number }>;
  spin?: number;
  zoom?: number;
}) {
  const geometry = useMemo(() => new IcosahedronGeometry(FIT_RADIUS, 0), []);
  // Solid, flat-normal copy for the halftone (Style B).
  const solidGeometry = useMemo(() => {
    const g = geometry.toNonIndexed();
    g.computeVertexNormals();
    return g;
  }, [geometry]);
  useEffect(
    () => () => {
      geometry.dispose();
      solidGeometry.dispose();
    },
    [geometry, solidGeometry],
  );
  return (
    <ShapeMeshes
      geometry={geometry}
      solidGeometry={solidGeometry}
      tilt={tilt}
      spin={spin}
      zoom={zoom}
    />
  );
}

/**
 * Robot — public/robot.glb (50K-tri simplified mesh) rendered as CREASE edges.
 * We take position-only geometry (baked materials/textures dropped), run it
 * through EdgesGeometry at ROBOT_EDGE_ANGLE_DEG, and draw the resulting line set
 * with the bright additive treatment. The mesh is already indexed, which
 * EdgesGeometry needs to find face adjacency.
 */
function RobotShape({
  tilt,
  spin = 0,
  zoom = 1,
}: {
  tilt: React.RefObject<{ x: number; y: number }>;
  spin?: number;
  zoom?: number;
}) {
  const { scene } = useGLTF("/robot.glb");

  const { geometry, solidGeometry, scale } = useMemo(() => {
    let srcMesh: Mesh | null = null;
    scene.traverse((o) => {
      if (!srcMesh && o instanceof Mesh) srcMesh = o;
    });
    if (!srcMesh) {
      return { geometry: new BufferGeometry(), solidGeometry: new BufferGeometry(), scale: 1 };
    }
    const found = srcMesh as Mesh;
    const src = found.geometry as BufferGeometry;

    const base = new BufferGeometry();
    base.setAttribute("position", src.getAttribute("position").clone());
    if (src.index) base.setIndex(src.index.clone());
    // Bake the node's world transform into the vertices (defensive — identity in
    // the current file) so the figure isn't tilted/mis-scaled.
    found.updateWorldMatrix(true, false);
    base.applyMatrix4(found.matrixWorld);

    // Style A: crease-edge extraction from the indexed base.
    const edges = new EdgesGeometry(base, ROBOT_EDGE_ANGLE_DEG);
    const geometry = stripEyeBackDuplicates(edges); // + eye-dup removal
    edges.dispose();

    // Style B: the solid mesh with flat (per-face) normals for the halftone.
    const solidGeometry = base.toNonIndexed();
    solidGeometry.computeVertexNormals();
    base.dispose();

    geometry.computeBoundingSphere();
    const r = geometry.boundingSphere?.radius ?? 1;
    return { geometry, solidGeometry, scale: FIT_RADIUS / r };
  }, [scene]);

  useEffect(
    () => () => {
      geometry.dispose();
      solidGeometry.dispose();
    },
    [geometry, solidGeometry],
  );
  return (
    <ShapeMeshes
      geometry={geometry}
      solidGeometry={solidGeometry}
      scale={scale}
      poseA={ROBOT_POSE_A}
      poseB={ROBOT_POSE_B}
      style={ROBOT_STYLE}
      tilt={tilt}
      spin={spin}
      zoom={zoom}
      arms // robot has arms → enable the shoulder-pivot breathe sway
    />
  );
}

export function HeroHead({
  shape = "icosahedron",
  spin = 0,
  zoom = 1,
}: {
  shape?: HeadShape;
  /** Continuous slow auto-spin about Y (radians/sec). Mouse tilt still applies. */
  spin?: number;
  /** Scale multiplier so the model fills more of its canvas (1 = default fit). */
  zoom?: number;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  // Shared, mutable target for the eased look-at angle (degrees).
  const tilt = useRef({ x: 0, y: 0 });

  // Wire the existing damped mouse tracker to the tilt ref (no DOM target).
  useEffect(() => {
    const stop = headPointerTilt(null, {
      onUpdate: (rotX, rotY) => {
        tilt.current.x = rotX;
        tilt.current.y = rotY;
      },
    });
    return () => stop();
  }, []);

  // Pause the render loop when the wrapper is scrolled out of view.
  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={wrapper}
      className={`h-full w-full ${shape === "robot" ? ROBOT_GLOW_CLASS : ""}`}
    >
      <Canvas
        frameloop={inView ? "always" : "never"}
        dpr={[1, 2]} // cap pixel ratio at 2 (≈ Math.min(devicePixelRatio, 2))
        camera={{ position: [0, 0, 2.9], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {shape === "robot" ? (
            <RobotShape tilt={tilt} spin={spin} zoom={zoom} />
          ) : (
            <PolyShape tilt={tilt} spin={spin} zoom={zoom} />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
