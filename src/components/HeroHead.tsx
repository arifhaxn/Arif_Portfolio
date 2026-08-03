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
  EdgesGeometry,
  IcosahedronGeometry,
  MathUtils,
  Mesh,
  NormalBlending,
  Vector3,
  type Group,
  type LineBasicMaterial,
  type MeshBasicMaterial,
  type ShaderMaterial,
} from "three";
import {
  headPointerTilt,
  idlePoseSwap,
  prefersReducedMotion,
  styleShift,
} from "@/lib/animations";

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
  void main() {
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
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
    float lum = diff * 0.9 + spec * 0.7 + 0.04;         // + faint ambient floor
    // Strong tonal remap: darks fall to nothing, highlights go fully dense.
    lum = smoothstep(0.06, 0.92, lum);
    vec2 cell = mod(gl_FragCoord.xy, uDotSize) / uDotSize - 0.5;
    float dist = length(cell) * 2.0;
    float radius = sqrt(lum) * 1.15; // dot area ~ luminance
    float coverage = 1.0 - smoothstep(radius - 0.1, radius + 0.1, dist);
    float a = coverage * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vec3(1.0), a);
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
// The head dome is see-through (intentional), so each front eye socket shows a
// faint duplicate of the far/inner dome surface behind it. We drop ONLY those
// back-dome segments inside a small disc at each eye — 18 segments (0.04% of the
// model). The antenna (z > -0.13) and every other see-through edge (6.2K
// back-facing segments elsewhere) are untouched, so global transparency is
// unchanged. Coordinates are in the model's local space; re-derive with
// scripts if robot.glb is ever replaced.
const EYE_CENTERS: [number, number][] = [
  [-0.2, 0.73],
  [0.2, 0.73],
];
const EYE_RADIUS = 0.11; // (x,y) disc around each eye
const EYE_BACK_Z = -0.15; // segments behind this (inner/far dome) are the duplicate

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
  // ~13% dimmer than pure white/blue-300; on an additive material scaling color
  // is equivalent to lowering opacity but survives the crossfade (which drives
  // opacity 0↔1).
  colorA: "#dedede",
  colorB: "#80abdc",
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
}) {
  const group = useRef<Group>(null);
  const matA = useRef<MeshBasicMaterial | LineBasicMaterial>(null);
  const matB = useRef<MeshBasicMaterial | LineBasicMaterial>(null);

  // Accumulated auto-spin angle (radians). Reduced motion disables the spin.
  const spinAngle = useRef(0);
  const reduce = useMemo(() => prefersReducedMotion(), []);

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
    }),
    [],
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

  // Each frame: slow auto-spin + mouse look-at on the group, and the combined
  // pose × style opacity on Style A materials / the halftone opacity on Style B.
  useFrame((_, delta) => {
    if (!group.current) return;
    if (!reduce) spinAngle.current += spin * delta;
    group.current.rotation.x = MathUtils.degToRad(tilt.current.x);
    group.current.rotation.y = MathUtils.degToRad(tilt.current.y) + spinAngle.current;

    const mix = styleMix.current.v;
    const invMix = 1 - mix;
    if (matA.current) matA.current.opacity = poseOpA.current.opacity * invMix;
    if (matB.current) matB.current.opacity = poseOpB.current.opacity * invMix;
    if (halftoneMat.current) halftoneMat.current.uniforms.uOpacity.value = mix;
  });

  const blending = style.additive ? AdditiveBlending : NormalBlending;

  return (
    <group ref={group}>
      <Center scale={scale * zoom}>
        {/* --- Style B: halftone dot-matrix over the solid mesh --- */}
        <mesh geometry={solidGeometry} rotation={poseA}>
          <shaderMaterial
            ref={halftoneMat}
            transparent
            depthWrite={false}
            uniforms={halftoneUniforms}
            vertexShader={HALFTONE_VERTEX}
            fragmentShader={HALFTONE_FRAGMENT}
          />
        </mesh>

        {/* --- Style A: the existing wireframe / crease-line treatment --- */}
        {style.renderAs === "lines" ? (
          <>
            <lineSegments geometry={geometry} rotation={poseA}>
              <lineBasicMaterial
                ref={matA}
                transparent
                opacity={1}
                depthWrite={false}
                blending={blending}
                color={style.colorA}
              />
            </lineSegments>
            <lineSegments geometry={geometry} rotation={poseB}>
              <lineBasicMaterial
                ref={matB}
                transparent
                opacity={0}
                depthWrite={false}
                blending={blending}
                color={style.colorB}
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
  );
}

/** Default lightweight shape — 20-face icosahedron (the confirmed baseline). */
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
