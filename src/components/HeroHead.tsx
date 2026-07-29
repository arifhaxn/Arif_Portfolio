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
//     4–6s hold loop, retargeted at the two wireframe MATERIALS' opacity. Two
//     overlapping meshes at slightly different resting angles crossfade.
//
// Two selectable shapes (the `shape` prop):
//   • "icosahedron" (default) — the lightweight procedural polyhedron (20 tris),
//     dim-gray wireframe: the confirmed Hero/Projects look, untouched.
//   • "robot" — public/robot.glb, FULL 237K-triangle wireframe (every triangle
//     edge — the dense fully-triangulated look; deliberately NO edge-angle
//     filtering or decimation). Rendered bright: pure-white lines with ADDITIVE
//     blending — where dense sub-pixel lines overlap they sum toward white, so
//     dense regions glow instead of muddying to gray — plus a compositor-level
//     drop-shadow on the canvas for a subtle halo (geometry-independent cost,
//     unlike layering duplicate line geometry, which would double the 1.4M-line
//     draw). GL_LINES are hard-capped at 1px on Windows/ANGLE, so "thickness"
//     comes from the glow halo; true fat lines (LineSegments2) would quad-
//     instance every segment and multiply frame cost — not viable at this
//     density.
//
// Performance / lifecycle:
//   • dpr capped at 2; IntersectionObserver flips frameloop to "never" when the
//     wrapper scrolls out of view; geometries we create are disposed on unmount
//     (R3F disposes materials/renderer; drei's GLTF cache is deliberately kept
//     so a remount doesn't re-download/re-parse).
//   • Reduced-motion / no-mouse: helpers hold Pose A at rest, no tracking/loop.
// -----------------------------------------------------------------------------

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, useGLTF } from "@react-three/drei";
import {
  AdditiveBlending,
  BufferGeometry,
  IcosahedronGeometry,
  MathUtils,
  Mesh,
  NormalBlending,
  type Group,
  type MeshBasicMaterial,
} from "three";
import { headPointerTilt, idlePoseSwap } from "@/lib/animations";

export type HeadShape = "icosahedron" | "robot";

type Euler3 = [number, number, number];

// Resting orientations the pose cross-fade transitions between (radians).
// Per-shape: the abstract polyhedron looks best with a tilted 3/4 facet view,
// but a humanoid figure must stand UPRIGHT — X/Z tilt reads as leaning. The
// robot therefore only ever rotates about Y (a turn), never off its vertical
// axis.
const POLY_POSE_A: Euler3 = [0.2, 0.35, 0];
const POLY_POSE_B: Euler3 = [-0.15, 0.9, 0.08];
const ROBOT_POSE_A: Euler3 = [0, 0, 0]; // upright, facing forward
const ROBOT_POSE_B: Euler3 = [0, 0.6, 0]; // upright, turned ~34°

// Normalize every shape to this bounding radius so camera framing (z 2.9,
// fov 45) works for any geometry.
const FIT_RADIUS = 1.1;

// Wireframe treatments. The polyhedron keeps the site's original dim-gray look;
// the dense robot gets the bright/glowing treatment so 237K triangles read as
// crisp luminous structure on the pure-black background instead of gray mush.
const POLY_STYLE = {
  colorA: "#d4d4d8", // zinc-300 — resting pose
  colorB: "#60a5fa", // blue-400 — alternate pose
  additive: false,
  hiddenLine: false, // low-poly: no far-side clutter to hide
};
const ROBOT_STYLE = {
  // ~13% dimmer than pure white/blue-300. On an ADDITIVE material, scaling the
  // color scales each line's contribution — perceptually identical to lowering
  // opacity, but it survives the pose-crossfade (which drives opacity 0↔1 and
  // would overwrite a lowered opacity). Calms the dense overlap without fading
  // the lines out.
  colorA: "#dedede", // ~87% white
  colorB: "#80abdc", // blue-300 dimmed to match
  additive: true, // overlapping lines sum toward white → built-in glow
  hiddenLine: true, // dense enclosed form: occlude the see-through far edges
};

// Canvas-level fake bloom for the robot: a compositor drop-shadow haloes every
// lit pixel. Cost is resolution-dependent only — independent of line count.
const ROBOT_GLOW_CLASS =
  "[filter:drop-shadow(0_0_6px_rgba(255,255,255,0.30))]";

/**
 * Shared inner renderer: tilt group + the two crossfading pose meshes. All
 * behavior (tilt, crossfade) lives here so shapes only supply geometry and a
 * color/blending style.
 */
function ShapeMeshes({
  geometry,
  scale = 1,
  poseA = POLY_POSE_A,
  poseB = POLY_POSE_B,
  style = POLY_STYLE,
  tilt,
}: {
  geometry: BufferGeometry;
  scale?: number;
  poseA?: Euler3;
  poseB?: Euler3;
  style?: typeof POLY_STYLE;
  tilt: React.RefObject<{ x: number; y: number }>;
}) {
  const group = useRef<Group>(null);
  const matA = useRef<MeshBasicMaterial>(null);
  const matB = useRef<MeshBasicMaterial>(null);
  const occA = useRef<Mesh>(null);
  const occB = useRef<Mesh>(null);

  // Pose cross-fade — exact idle-swap timing, retargeted at materials.
  useEffect(() => {
    if (!matA.current || !matB.current) return;
    const tl = idlePoseSwap(matA.current, matB.current);
    return () => {
      tl.kill();
    };
  }, []);

  useFrame(() => {
    if (!group.current) return;
    // Copy the smoothed look-at angle (degrees → radians) each frame.
    group.current.rotation.x = MathUtils.degToRad(tilt.current.x);
    group.current.rotation.y = MathUtils.degToRad(tilt.current.y);

    // Hidden-line coordination across the crossfade: exactly ONE occluder is
    // active — the one belonging to whichever pose is currently more opaque.
    // Each occluder is a child of its pose mesh, so it shares that pose's
    // rotation; a pose's far edges are hidden by its OWN near surface, never the
    // other pose's. The active occluder flips at the crossfade's 50% crossover,
    // so at rest (one pose fully visible) there's no stale depth from the hidden
    // pose bleeding into the visible one.
    if (occA.current && occB.current && matA.current && matB.current) {
      const aDominant = matA.current.opacity >= matB.current.opacity;
      occA.current.visible = aDominant;
      occB.current.visible = !aDominant;
    }
  });

  const blending = style.additive ? AdditiveBlending : NormalBlending;

  // Invisible depth-only occluder matching a pose's surface. Writes depth (so the
  // wireframe's far edges fail the depth test and don't show through) but no
  // color. polygonOffset nudges the surface very slightly back so the coincident
  // NEAR edges stay in front of it and survive — without it they z-fight and
  // flicker out. Rendered as a child of each pose mesh, so it inherits that
  // pose's exact rotation.
  const occluderMaterial = (
    <meshBasicMaterial
      colorWrite={false}
      depthWrite
      polygonOffset
      polygonOffsetFactor={1}
      polygonOffsetUnits={1}
    />
  );

  return (
    <group ref={group}>
      <Center scale={scale}>
        {/* Pose A — visible at rest (opacity 1). */}
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
          {style.hiddenLine && (
            <mesh ref={occA} geometry={geometry} renderOrder={-1}>
              {occluderMaterial}
            </mesh>
          )}
        </mesh>
        {/* Pose B — hidden at rest (opacity 0), fades in on the loop. */}
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
          {style.hiddenLine && (
            // Starts hidden (pose A is dominant at rest); useFrame owns it after
            // frame 1 — avoids a one-frame both-occluders-on flash on mount.
            <mesh ref={occB} geometry={geometry} renderOrder={-1} visible={false}>
              {occluderMaterial}
            </mesh>
          )}
        </mesh>
      </Center>
    </group>
  );
}

/** Default lightweight shape — 20-face icosahedron (the confirmed baseline). */
function PolyShape({ tilt }: { tilt: React.RefObject<{ x: number; y: number }> }) {
  const geometry = useMemo(() => new IcosahedronGeometry(FIT_RADIUS, 0), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <ShapeMeshes geometry={geometry} tilt={tilt} />;
}

/**
 * Dense shape — the android robot from public/robot.glb, drawn as a FULL
 * wireframe (all ~712K triangle edges; density is the look, per the reference
 * site). We extract ONLY the position data from the glb's single mesh (baked
 * materials/textures dropped) and render it with the bright additive treatment.
 * Attributes are cloned so disposing our copy can't corrupt drei's cache.
 */
function RobotShape({ tilt }: { tilt: React.RefObject<{ x: number; y: number }> }) {
  const { scene } = useGLTF("/robot.glb");

  const { geometry, scale } = useMemo(() => {
    let srcMesh: Mesh | null = null;
    scene.traverse((o) => {
      if (!srcMesh && o instanceof Mesh) srcMesh = o;
    });
    if (!srcMesh) return { geometry: new BufferGeometry(), scale: 1 };
    const found = srcMesh as Mesh;
    const src = found.geometry as BufferGeometry;
    const geo = new BufferGeometry();
    geo.setAttribute("position", src.getAttribute("position").clone());
    if (src.index) geo.setIndex(src.index.clone());
    // Bake the node's world transform into the vertices: raw geometry ignores
    // any rotation/scale the exporter put on the glTF NODE, which would leave
    // the figure tilted/mis-scaled. (Identity in the current file — defensive.)
    found.updateWorldMatrix(true, false);
    geo.applyMatrix4(found.matrixWorld);
    geo.computeBoundingSphere();
    const r = geo.boundingSphere?.radius ?? 1;
    return { geometry: geo, scale: FIT_RADIUS / r };
  }, [scene]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <ShapeMeshes
      geometry={geometry}
      scale={scale}
      poseA={ROBOT_POSE_A}
      poseB={ROBOT_POSE_B}
      style={ROBOT_STYLE}
      tilt={tilt}
    />
  );
}

export function HeroHead({ shape = "icosahedron" }: { shape?: HeadShape }) {
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
        {/* Suspense: useGLTF suspends while the glb downloads/parses; nothing
            renders in the slot until it's ready (no fallback shape by design). */}
        <Suspense fallback={null}>
          {shape === "robot" ? <RobotShape tilt={tilt} /> : <PolyShape tilt={tilt} />}
        </Suspense>
      </Canvas>
    </div>
  );
}
