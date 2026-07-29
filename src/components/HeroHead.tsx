"use client";

// -----------------------------------------------------------------------------
// HeroHead — React Three Fiber wireframe centerpiece
// -----------------------------------------------------------------------------
// The photo-derived head model is set aside for now; this renders a clean
// abstract placeholder — a low-poly ICOSAHEDRON (20 triangular facets) — wired
// into the SAME two behaviors as before (nothing about their timing/feel changes):
//
//   • Mouse tilt — `headPointerTilt` still computes the damped, lerp-smoothed
//     look-at angle. We pass it `onUpdate`, so the eased degrees flow into a ref
//     that `useFrame` copies onto the group's rotation. Same tuning, same target.
//
//   • Pose cross-fade — `idlePoseSwap` still runs its 0.8s / power2.inOut fade on
//     a 4–6s hold loop, retargeted at the two wireframe MATERIALS' `opacity`. Two
//     overlapping icosahedra at slightly different resting angles crossfade, so
//     the facets appear to shift — the same pose-swap motion as before.
//
// Performance / lifecycle (unchanged):
//   • dpr capped at 2 so it stays cheap on high-DPI screens.
//   • An IntersectionObserver flips the Canvas frameloop to "never" when the hero
//     scrolls out of view, so the GPU idles once you've scrolled past.
//   • Geometry is disposed on unmount; R3F disposes materials/renderer/canvas
//     (StrictMode-safe), so there's no leak or duplicate canvas in dev.
//   • Reduced-motion / no-mouse: the helpers hold Pose A at its resting angle
//     with no tracking and no loop.
//
// Note: no .glb/useGLTF is (or ever was) involved — the shape is a built-in
// Three primitive. drei is kept only for <Center>, ready for the head's return.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center } from "@react-three/drei";
import {
  IcosahedronGeometry,
  MathUtils,
  type Group,
  type MeshBasicMaterial,
} from "three";
import { headPointerTilt, idlePoseSwap } from "@/lib/animations";

// Two resting orientations the pose cross-fade transitions between (radians).
// Pose A is a calm 3/4 facet view (also the reduced-motion static pose); Pose B
// is rotated to a different facet arrangement so the crossfade reads as a shift.
const POSE_A_ROTATION: [number, number, number] = [0.2, 0.35, 0];
const POSE_B_ROTATION: [number, number, number] = [-0.15, 0.9, 0.08];

function Shape({ tilt }: { tilt: React.RefObject<{ x: number; y: number }> }) {
  const group = useRef<Group>(null);
  const matA = useRef<MeshBasicMaterial>(null);
  const matB = useRef<MeshBasicMaterial>(null);

  // Build the icosahedron once (radius 1.1, detail 0 = 20 faces); own disposal.
  // Every vertex sits on the circumscribed sphere, so no rotation ever clips.
  const geometry = useMemo(() => new IcosahedronGeometry(1.1, 0), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Pose cross-fade — reuse the exact idle-swap timing, retargeted at materials.
  useEffect(() => {
    if (!matA.current || !matB.current) return;
    const tl = idlePoseSwap(matA.current, matB.current);
    return () => {
      tl.kill();
    };
  }, []);

  // Copy the smoothed look-at angle (degrees → radians) onto the shape each frame.
  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.x = MathUtils.degToRad(tilt.current.x);
    group.current.rotation.y = MathUtils.degToRad(tilt.current.y);
  });

  return (
    <group ref={group}>
      {/* Center keeps the shape centered regardless of geometry (harmless for the
          origin-centered icosahedron; matters again when the head returns). */}
      <Center>
        {/* Pose A — light wireframe, visible at rest (opacity 1). */}
        <mesh geometry={geometry} rotation={POSE_A_ROTATION}>
          <meshBasicMaterial
            ref={matA}
            wireframe
            transparent
            opacity={1}
            depthWrite={false}
            color="#d4d4d8"
          />
        </mesh>
        {/* Pose B — blue wireframe, hidden at rest (opacity 0), fades in on loop. */}
        <mesh geometry={geometry} rotation={POSE_B_ROTATION}>
          <meshBasicMaterial
            ref={matB}
            wireframe
            transparent
            opacity={0}
            depthWrite={false}
            color="#60a5fa"
          />
        </mesh>
      </Center>
    </group>
  );
}

export function HeroHead() {
  const wrapper = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  // Shared, mutable target for the eased look-at angle (degrees). headPointerTilt
  // writes it on GSAP's ticker; <Shape>'s useFrame reads it.
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

  // Pause the render loop when the hero is scrolled out of view.
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
    <div ref={wrapper} className="h-full w-full">
      <Canvas
        frameloop={inView ? "always" : "never"}
        dpr={[1, 2]} // cap pixel ratio at 2 (≈ Math.min(devicePixelRatio, 2))
        camera={{ position: [0, 0, 2.9], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Shape tilt={tilt} />
      </Canvas>
    </div>
  );
}
