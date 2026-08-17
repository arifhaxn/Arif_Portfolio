"use client";

// -----------------------------------------------------------------------------
// SpaceTimeFabric — a rippling "sheet of space" bent by moving gravity wells
// -----------------------------------------------------------------------------
// Same crisp/smooth pipeline as <Tesseract> (that's the "tweaks" this shares):
// vanilla three, particles are REAL instanced cones (not soft point sprites, so
// they stay sharp), UnrealBloom for the glow, FogExp2 for depth, and a persistent
// positions array lerped toward each target every frame for a fluid, trailing
// feel. Recoloured to the site's white; tier-gated (mid/high only; low tier +
// reduced motion skip / freeze it), the loop stops off-screen, dpr-capped,
// container-sized, disposed on unmount.
//
// The PARTICLE MATH is the space-time fabric (ported from the sandbox export):
// each particle sits at a fixed scattered spot on a large plane; a travelling
// sine wave ripples it in depth, two slowly-drifting gravity wells bend the sheet
// toward them, and a shear twist near the wells drags the plane (frame-dragging).
// Drop it in a sized container (fills h/w); place behind content at a low opacity.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/animations";
import { detectQualityTier, QUALITY, type QualityTier } from "@/lib/quality";
import { SWARM_COUNT } from "@/lib/motion";

export function SpaceTimeFabric() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tier, setTier] = useState<QualityTier | null>(null);
  const reduce = useMemo(() => prefersReducedMotion(), []);
  // Desktop-only: a per-frame CPU displacement loop + bloom is too heavy for
  // phones (and it's an ambient backdrop). Gating the effect means no WebGL
  // context is created on mobile at all.
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => setTier(detectQualityTier()), []);

  useEffect(() => {
    if (tier === null || tier === "low" || !wide) return;
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { EffectComposer } = await import(
        "three/examples/jsm/postprocessing/EffectComposer.js"
      );
      const { RenderPass } = await import(
        "three/examples/jsm/postprocessing/RenderPass.js"
      );
      const { UnrealBloomPass } = await import(
        "three/examples/jsm/postprocessing/UnrealBloomPass.js"
      );
      if (disposed) return;

      // A bit denser than the tesseract — this is a spread field, not edges.
      const COUNT =
        tier === "high" ? Math.round(SWARM_COUNT * 1.25) : Math.round(SWARM_COUNT * 0.8);
      // Tier-aware pixel-ratio cap (high 2, mid 1.5) so mid devices render lighter.
      const dpr = Math.min(window.devicePixelRatio || 1, QUALITY[tier].maxDpr);
      const size = () => ({
        w: Math.max(1, container.clientWidth),
        h: Math.max(1, container.clientHeight),
      });
      let { w, h } = size();

      // --- fabric params ---
      const scale = 135; // half-extent of the fabric plane (wide enough to fill)
      const freq = 2.2; // wave frequency
      const amp = 6; // wave amplitude (depth ripple)
      const speed = 0.85; // flow speed
      const pull = 7; // gravity-well strength
      const twist = 1.3; // shear twist near the wells
      const spin = 0.12; // left→right rotation speed (rad/s) around the vertical axis

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x000000, 0.006);
      const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 2000);
      camera.position.set(0, 0, 100);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      container.appendChild(renderer.domElement);

      const composer = new EffectComposer(renderer);
      composer.setPixelRatio(dpr);
      composer.setSize(w, h);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 0.85);
      bloom.strength = 1.35;
      bloom.radius = 0.32;
      bloom.threshold = 0.05;
      composer.addPass(bloom);

      // --- instanced cones (sharp, like Tesseract) ---
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      const target = new THREE.Vector3();
      const geometry = new THREE.ConeGeometry(0.1, 0.5, 4).rotateX(Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);

      // fixed scattered plane position per particle (hash), + persistent positions
      const baseX = new Float32Array(COUNT);
      const baseY = new Float32Array(COUNT);
      const positions: InstanceType<typeof THREE.Vector3>[] = [];
      for (let i = 0; i < COUNT; i++) {
        const u = (Math.sin(i * 12.9898) * 43758.5453) % 1;
        const v = (Math.sin(i * 78.233) * 12345.6789) % 1;
        baseX[i] = (u * 2 - 1) * scale;
        baseY[i] = (v * 2 - 1) * scale;
        positions.push(
          new THREE.Vector3(
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100,
          ),
        );
        mesh.setColorAt(i, color.setHex(0xffffff));
      }

      const clock = new THREE.Clock();
      const animated = !reduce;

      const renderFrame = (snap: boolean) => {
        const elapsed = snap ? 0 : clock.getElapsedTime();
        // Rotate the whole plane around the VERTICAL axis (left→right), so it turns
        // like a sheet and goes edge-on at the halfway point — as in the source.
        mesh.rotation.y = elapsed * spin;
        const time = elapsed * speed;
        // two wells drift on lazy Lissajous paths
        const w1x = Math.sin(time * 0.3) * scale * 0.4;
        const w1y = Math.cos(time * 0.2) * scale * 0.4;
        const w2x = Math.sin(time * 0.5 + 2) * scale * 0.3;
        const w2y = Math.cos(time * 0.4 + 1) * scale * 0.3;

        for (let i = 0; i < COUNT; i++) {
          const x = baseX[i];
          const y = baseY[i];
          const wave =
            Math.sin(x * 0.02 * freq + time) + Math.sin(y * 0.02 * freq - time * 0.8);
          let z = wave * amp;

          const dx1 = x - w1x;
          const dy1 = y - w1y;
          const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1 + 4);
          const dx2 = x - w2x;
          const dy2 = y - w2y;
          const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2 + 4);
          const bend1 = -pull / d1;
          const bend2 = -pull / d2;
          z += bend1 + bend2;

          // shear twist (frame-dragging) near the wells
          const ang = twist * (bend1 - bend2);
          const cosA = Math.cos(ang);
          const sinA = Math.sin(ang);
          const tx = x * cosA - y * sinA;
          const ty = x * sinA + y * cosA;
          target.set(tx, ty, z);

          // white, brightening where the sheet is most curved
          const depth = Math.min(Math.abs(z) / (amp + 4), 1);
          const lum = Math.min(0.5 + depth * 0.5, 1);
          color.setHSL(0.58, 0.14, lum);

          if (snap) positions[i].copy(target);
          else positions[i].lerp(target, 0.1);
          dummy.position.copy(positions[i]);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          mesh.setColorAt(i, color);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        composer.render();
      };

      const ro = new ResizeObserver(() => {
        const s = size();
        w = s.w;
        h = s.h;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        composer.setSize(w, h);
        if (!animated) renderFrame(true);
      });
      ro.observe(container);

      let raf = 0;
      let running = false;
      let io: IntersectionObserver | null = null;

      if (animated) {
        const loop = () => {
          renderFrame(false);
          raf = requestAnimationFrame(loop);
        };
        const start = () => {
          if (running) return;
          running = true;
          raf = requestAnimationFrame(loop);
        };
        const stop = () => {
          running = false;
          cancelAnimationFrame(raf);
        };
        io = new IntersectionObserver(
          ([e]) => (e.isIntersecting ? start() : stop()),
          { threshold: 0 },
        );
        io.observe(container);
        start();
      } else {
        renderFrame(true);
      }

      cleanup = () => {
        cancelAnimationFrame(raf);
        io?.disconnect();
        ro.disconnect();
        geometry.dispose();
        material.dispose();
        bloom.dispose();
        composer.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [tier, reduce, wide]);

  return <div ref={containerRef} aria-hidden className="h-full w-full" />;
}
