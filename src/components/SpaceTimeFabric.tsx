"use client";

// -----------------------------------------------------------------------------
// SpaceTimeFabric — ambient "gravity-well fabric" background
// -----------------------------------------------------------------------------
// A site-native, optimized reworking of the pasted space_time_fabric.js sandbox
// export. That original ran a 20,000-cone JS loop + UnrealBloom every frame and
// was full-window, unthemed, and not adaptive. This keeps the IDEA — a grid of
// points forming a sheet of space that ripples and dents around two slowly
// drifting gravity wells, with a frame-dragging twist — but does ALL the
// deformation on the GPU in the vertex shader (no per-point JS loop), recolors it
// to the site's single blue, and behaves like the rest of the 3D here:
//   • Device tier (see lib/quality): the effect only renders on mid/high tiers
//     with motion allowed; low tier / reduced motion / phones skip it entirely
//     (it's ambient, never load-bearing).
//   • The render loop stops when the section scrolls out of view (frameloop
//     "never" via IntersectionObserver), like HeroHead.
//   • Additive points + a soft center vignette keep it a quiet backdrop that the
//     contact copy still reads cleanly over — no bloom pass.
// Rendered as an absolute, pointer-events-none layer behind a section's content.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ShaderMaterial,
  Vector2,
} from "three";
import { prefersReducedMotion } from "@/lib/animations";
import { detectQualityTier, type QualityTier } from "@/lib/quality";

const SCALE = 60; // half-extent of the fabric plane in world units

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform float uFreq;
  uniform float uPull;
  uniform float uTwist;
  uniform float uSize;
  uniform vec2 uWellA;
  uniform vec2 uWellB;
  varying float vDepth;
  void main() {
    vec3 p = position;            // x,y on the flat grid, z = 0
    float t = uTime;
    // travelling space-time ripples
    float wave = sin(p.x * uFreq + t) + sin(p.y * uFreq - t * 0.8);
    float z = wave * uAmp;
    // two moving gravity wells bend the fabric (softened distance)
    float dA = sqrt(dot(p.xy - uWellA, p.xy - uWellA) + 4.0);
    float dB = sqrt(dot(p.xy - uWellB, p.xy - uWellB) + 4.0);
    float bendA = -uPull / dA;
    float bendB = -uPull / dB;
    z += bendA + bendB;
    // shear twist (frame-dragging illusion) near the wells
    float ang = uTwist * (bendA - bendB);
    float c = cos(ang), s = sin(ang);
    vec2 rot = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
    vDepth = clamp(abs(z) / (uAmp * 2.0 + 4.0), 0.0, 1.0);
    vec4 mv = modelViewMatrix * vec4(rot, z, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (300.0 / max(-mv.z, 1.0)); // perspective size falloff
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
    // single blue, brightening toward white where the fabric is most curved
    vec3 base = vec3(0.231, 0.51, 0.965);        // #3b82f6
    vec3 col = mix(base * 0.55, mix(base, vec3(0.75, 0.87, 1.0), vDepth), 0.4 + vDepth * 0.6);
    float a = soft * uOpacity * (0.22 + vDepth * 0.78);
    gl_FragColor = vec4(col, a);
  }
`;

/** Flat grid of points spanning [-SCALE, SCALE]² on the XY plane. */
function buildGrid(cols: number, rows: number): BufferGeometry {
  const pos = new Float32Array(cols * rows * 3);
  let k = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pos[k++] = (c / (cols - 1) - 0.5) * 2 * SCALE;
      pos[k++] = (r / (rows - 1) - 0.5) * 2 * SCALE;
      pos[k++] = 0;
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  return g;
}

function Fabric({ cols, rows }: { cols: number; rows: number }) {
  const matRef = useRef<ShaderMaterial>(null);
  const geometry = useMemo(() => buildGrid(cols, rows), [cols, rows]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 2.6 },
      uFreq: { value: 0.08 },
      uPull: { value: 7 },
      uTwist: { value: 0.7 },
      uSize: { value: 2.3 },
      uOpacity: { value: 0.6 },
      uWellA: { value: new Vector2() },
      uWellB: { value: new Vector2() },
    }),
    [],
  );

  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;
    const u = m.uniforms;
    u.uTime.value += Math.min(delta, 0.05);
    const t = u.uTime.value;
    // two wells drift on lazy Lissajous paths
    u.uWellA.value.set(Math.sin(t * 0.3) * 22, Math.cos(t * 0.22) * 22);
    u.uWellB.value.set(Math.sin(t * 0.45 + 2) * 18, Math.cos(t * 0.38 + 1) * 18);
  });

  return (
    // Tilt the sheet back so it reads as a receding fabric, dropped low so the
    // densest ripples sit toward the bottom of the section.
    <points geometry={geometry} rotation={[-0.62, 0, 0]} position={[0, -6, 0]}>
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

/**
 * Ambient fabric background. Drop it as the first child of a `relative` section;
 * it fills the section behind the content (which should sit at `z-10`).
 */
export function SpaceTimeFabric() {
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

  // Ambient, never essential → skip entirely on the low tier / reduced motion.
  const show = tier !== null && tier !== "low" && !reduce;
  const high = tier === "high";
  const cols = high ? 180 : 120;
  const rows = high ? 100 : 68;

  return (
    <div
      ref={wrap}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {show && (
        <Canvas
          frameloop={inView ? "always" : "never"}
          dpr={[1, high ? 2 : 1.5]}
          camera={{ position: [0, 0, 80], fov: 60 }}
          gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        >
          <Fabric cols={cols} rows={rows} />
        </Canvas>
      )}
      {/* Soft center vignette so the contact copy stays legible over the field. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.35)_45%,transparent_75%)]" />
    </div>
  );
}
