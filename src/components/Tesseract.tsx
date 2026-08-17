"use client";

// -----------------------------------------------------------------------------
// Tesseract — a breathing 4D hypercube, traced by sharp instanced particles
// -----------------------------------------------------------------------------
// Site-native, optimized reworking of the pasted dubolt sandbox export (a
// "Breathing Tesseract": a 4-cube stereographically projected into 3D). The
// particles are REAL geometry — small solid octahedra drawn with an instanced
// mesh — so they stay crisp at any zoom (unlike fixed-pixel point sprites, which
// look soft and blur when scaled). The original looped 20k instances in JS every
// frame; here every instance's 4D rotation + breathing + projection runs in the
// vertex shader (each instance carries its 4D base coordinate in the `instanceA4`
// attribute), so it's cheap AND sharp. Recolored to the site's single blue,
// antialiased, depth-sorted.
//
// Replaces the wireframe icosahedron behind the Projects section; obeys the same
// conventions as the rest of the 3D here: tier-gated (mid/high only; low tier +
// reduced motion skip it), render loop stops off-screen, dpr-capped.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  InstancedBufferAttribute,
  OctahedronGeometry,
  ShaderMaterial,
} from "three";
import { prefersReducedMotion } from "@/lib/animations";
import { detectQualityTier, type QualityTier } from "@/lib/quality";

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uRot;
  uniform float uBreath;
  uniform float uFuzz;
  uniform float uScale;
  uniform float uPScale;      // particle (octahedron) size in world units
  uniform float uProj;        // 4D projection distance (higher = flatter, less flinging)
  attribute vec4 instanceA4;  // this instance's base coordinate on the 4-cube
  attribute float instancePhase;
  varying float vDepth;
  varying float vDist;        // distance of this instance's centre from origin
  void main() {
    vec4 p = instanceA4;
    // breathing pulse
    p *= 1.0 + 0.3 * sin(uTime * uBreath + instancePhase * 0.0001);
    // three 4D rotation planes (xw, yz, xy), incommensurate speeds
    float a1 = uTime * uRot;         float c1 = cos(a1), s1 = sin(a1);
    float x1 = p.x * c1 - p.w * s1;  float w1 = p.x * s1 + p.w * c1;
    float a2 = uTime * uRot * 0.618; float c2 = cos(a2), s2 = sin(a2);
    float y1 = p.y * c2 - p.z * s2;  float z1 = p.y * s2 + p.z * c2;
    float a3 = uTime * uRot * 0.382; float c3 = cos(a3), s3 = sin(a3);
    float Xf = x1 * c3 - y1 * s3;    float Yf = x1 * s3 + y1 * c3;
    float Zf = z1;                   float Wf = w1;
    // a touch of chaos so the edges shimmer
    Xf += sin(instancePhase * 1.3 + uTime) * uFuzz;
    Yf += cos(instancePhase * 1.7 - uTime) * uFuzz;
    Zf += sin(instancePhase * 2.1 + uTime * 1.2) * uFuzz;
    // stereographic projection 4D -> 3D → this instance's centre
    float wf = 1.0 / (uProj - Wf + 0.0001);
    vec3 centre = vec3(Xf, Yf, Zf) * wf * uScale;
    vDepth = wf;             // nearer in w = brighter
    vDist = length(centre);  // for the edge fade (so nothing hard-clips)
    // place the octahedron's local vertex around the projected centre
    vec3 world = centre + position * uPScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform float uFadeNear;
  uniform float uFadeFar;
  varying float vDepth;
  varying float vDist;
  void main() {
    float e = clamp((vDepth - 0.10) * 3.0, 0.0, 1.0);              // w-factor → 0..1
    vec3 col = mix(vec3(0.16, 0.44, 0.98), vec3(0.72, 0.86, 1.0), e); // blue -> white
    // fade particles that fling far out (the projection singularity) so the swarm
    // dissolves toward its edges instead of hard-clipping at the canvas border.
    float fade = smoothstep(uFadeFar, uFadeNear, vDist);
    float intensity = (0.35 + e * 0.65) * fade;
    // additive: the alpha is the added weight, so dense edges glow bright/white.
    gl_FragColor = vec4(col, intensity);
  }
`;

/** Per-instance 4D base coordinates: points spread along the 32 edges of a
 *  4-cube (the shader does the rotation/projection). */
function buildInstances(count: number) {
  const EDGES = 32;
  const per = Math.max(1, Math.floor(count / EDGES));
  const total = per * EDGES;
  const a4 = new Float32Array(total * 4);
  const phase = new Float32Array(total);
  let k = 0;
  for (let e = 0; e < EDGES; e++) {
    const axis = e % 4; // which of the 4 coords varies along this edge
    const fb = Math.floor(e / 4); // fixed ± signs of the other three
    const b1 = fb & 1 ? 1 : -1;
    const b2 = fb & 2 ? 1 : -1;
    const b3 = fb & 4 ? 1 : -1;
    for (let j = 0; j < per; j++) {
      const v = (j / per) * 2 - 1;
      let x: number, y: number, z: number, w: number;
      if (axis === 0) { x = v; y = b1; z = b2; w = b3; }
      else if (axis === 1) { x = b1; y = v; z = b2; w = b3; }
      else if (axis === 2) { x = b1; y = b2; z = v; w = b3; }
      else { x = b1; y = b2; z = b3; w = v; }
      a4[k * 4] = x;
      a4[k * 4 + 1] = y;
      a4[k * 4 + 2] = z;
      a4[k * 4 + 3] = w;
      phase[k] = k;
      k++;
    }
  }
  return { a4, phase, total };
}

function TesseractMesh({ count }: { count: number }) {
  const matRef = useRef<ShaderMaterial>(null);
  const { geometry, total } = useMemo(() => {
    const { a4, phase, total } = buildInstances(count);
    const g = new OctahedronGeometry(1, 0); // crisp little diamonds
    g.setAttribute("instanceA4", new InstancedBufferAttribute(a4, 4));
    g.setAttribute("instancePhase", new InstancedBufferAttribute(phase, 1));
    return { geometry: g, total };
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRot: { value: 0.35 },
      uBreath: { value: 1.2 },
      uFuzz: { value: 0.06 },
      uScale: { value: 60 },
      uPScale: { value: 0.3 }, // small crisp specks (dense, like the reference)
      uProj: { value: 5.0 }, // flatter projection → less flinging → fits the frame
      uFadeNear: { value: 30 }, // full brightness within this radius
      uFadeFar: { value: 42 }, // faded to nothing by here (before the canvas edge)
    }),
    [],
  );

  useFrame((_, delta) => {
    const m = matRef.current;
    if (m) m.uniforms.uTime.value += Math.min(delta, 0.05);
  });

  return (
    // frustumCulled off: the shader displaces vertices far from the geometry's
    // origin bounds, so three's culling can't see where they actually land.
    <instancedMesh args={[geometry, undefined, total]} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={AdditiveBlending}
      />
    </instancedMesh>
  );
}

/** Ambient hypercube. Drop it in a sized container (fills h/w). */
export function Tesseract() {
  const wrap = useRef<HTMLDivElement>(null);
  const [tier, setTier] = useState<QualityTier | null>(null);
  const reduce = useMemo(() => prefersReducedMotion(), []);
  const [inView, setInView] = useState(true);

  useEffect(() => setTier(detectQualityTier()), []);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const show = tier !== null && tier !== "low" && !reduce;
  const high = tier === "high";
  const count = high ? 16000 : 8000; // dense, like the reference

  return (
    // Cheap "bloom": a compositor drop-shadow haloes the bright additive pixels
    // (the same trick the robot uses), so it glows without a postprocessing pass.
    <div
      ref={wrap}
      aria-hidden
      className="h-full w-full [filter:drop-shadow(0_0_5px_rgba(59,130,246,0.45))]"
    >
      {show && (
        <Canvas
          frameloop={inView ? "always" : "never"}
          dpr={[1, 2]} // full pixel ratio → sharp geometry, no upscale blur
          camera={{ position: [0, 0, 85], fov: 55 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        >
          <TesseractMesh count={count} />
        </Canvas>
      )}
    </div>
  );
}
