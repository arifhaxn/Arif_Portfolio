"use client";

// -----------------------------------------------------------------------------
// Tesseract — a breathing 4D hypercube, traced by glowing points
// -----------------------------------------------------------------------------
// Site-native, optimized reworking of the pasted dubolt.js sandbox export (a
// "Breathing Tesseract": a 4D hypercube stereographically projected into 3D).
// The original looped 20,000 instanced spheres in JS + UnrealBloom every frame,
// full-window and rainbow-hued. This traces the cube's 32 edges with GL points
// and does ALL the 4D rotation + breathing + projection in the vertex shader
// (each point carries its 4D base coordinate in an `a4` attribute), recolored to
// the site's single blue.
//
// It replaces the wireframe icosahedron behind the Projects section, so it obeys
// the same conventions as the rest of the 3D here:
//   • Device tier (lib/quality): renders on mid/high only; low tier / reduced
//     motion skip it (it's an ambient backdrop, never load-bearing).
//   • The render loop stops when the wrapper scrolls out of view.
//   • dpr-capped, additive points, no bloom pass. Fills its container.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
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
  uniform float uSize;
  attribute vec4 a4;      // the point's base coordinate on the tesseract, in 4D
  attribute float aPhase; // per-point phase for breath + chaos
  varying float vDepth;
  void main() {
    vec4 p = a4;
    // breathing pulse
    p *= 1.0 + 0.3 * sin(uTime * uBreath + aPhase * 0.0001);
    // three 4D rotation planes (xw, yz, xy), incommensurate speeds
    float a1 = uTime * uRot;         float c1 = cos(a1), s1 = sin(a1);
    float x1 = p.x * c1 - p.w * s1;  float w1 = p.x * s1 + p.w * c1;
    float a2 = uTime * uRot * 0.618; float c2 = cos(a2), s2 = sin(a2);
    float y1 = p.y * c2 - p.z * s2;  float z1 = p.y * s2 + p.z * c2;
    float a3 = uTime * uRot * 0.382; float c3 = cos(a3), s3 = sin(a3);
    float Xf = x1 * c3 - y1 * s3;    float Yf = x1 * s3 + y1 * c3;
    float Zf = z1;                   float Wf = w1;
    // a touch of chaos so the edges shimmer
    Xf += sin(aPhase * 1.3 + uTime) * uFuzz;
    Yf += cos(aPhase * 1.7 - uTime) * uFuzz;
    Zf += sin(aPhase * 2.1 + uTime * 1.2) * uFuzz;
    // stereographic projection 4D -> 3D
    float wf = 1.0 / (4.0 - Wf + 0.0001);
    vec3 pos = vec3(Xf, Yf, Zf) * wf * uScale;
    vDepth = wf; // nearer in w = brighter
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (300.0 / max(-mv.z, 1.0));
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform float uOpacity;
  varying float vDepth;
  void main() {
    vec2 cc = gl_PointCoord - 0.5;
    float d = length(cc);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    float e = clamp((vDepth - 0.16) * 2.6, 0.0, 1.0); // normalize the w-factor
    vec3 col = mix(vec3(0.231, 0.51, 0.965) * 0.6, vec3(0.82, 0.9, 1.0), e); // blue -> white
    gl_FragColor = vec4(col, soft * uOpacity * (0.32 + e * 0.68));
  }
`;

/** Points spread evenly along the 32 edges of a 4-cube, each tagged with its 4D
 *  base coordinate (the shader does the rotation/projection). */
function buildTesseract(count: number): BufferGeometry {
  const EDGES = 32;
  const per = Math.max(1, Math.floor(count / EDGES));
  const total = per * EDGES;
  const a4 = new Float32Array(total * 4);
  const aPhase = new Float32Array(total);
  let k = 0;
  for (let e = 0; e < EDGES; e++) {
    const axis = e % 4; // which of the 4 coords varies along this edge
    const fb = Math.floor(e / 4); // the fixed ± signs of the other three
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
      aPhase[k] = k;
      k++;
    }
  }
  const g = new BufferGeometry();
  // `position` is required by three's point draw (count); the real coord is a4.
  g.setAttribute("position", new BufferAttribute(new Float32Array(total * 3), 3));
  g.setAttribute("a4", new BufferAttribute(a4, 4));
  g.setAttribute("aPhase", new BufferAttribute(aPhase, 1));
  return g;
}

function TesseractPoints({ count }: { count: number }) {
  const matRef = useRef<ShaderMaterial>(null);
  const geometry = useMemo(() => buildTesseract(count), [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRot: { value: 0.35 },
      uBreath: { value: 1.2 },
      uFuzz: { value: 0.06 },
      uScale: { value: 42 },
      uSize: { value: 2.2 },
      uOpacity: { value: 0.95 },
    }),
    [],
  );

  useFrame((_, delta) => {
    const m = matRef.current;
    if (m) m.uniforms.uTime.value += Math.min(delta, 0.05);
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
      />
    </points>
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
  const count = high ? 9600 : 4800;

  return (
    <div ref={wrap} aria-hidden className="h-full w-full">
      {show && (
        <Canvas
          frameloop={inView ? "always" : "never"}
          dpr={[1, high ? 2 : 1.5]}
          camera={{ position: [0, 0, 60], fov: 55 }}
          gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        >
          <TesseractPoints count={count} />
        </Canvas>
      )}
    </div>
  );
}
