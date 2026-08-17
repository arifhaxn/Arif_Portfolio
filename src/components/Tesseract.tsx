"use client";

// -----------------------------------------------------------------------------
// Tesseract — breathing 4D hypercube (faithful port of the dubolt export)
// -----------------------------------------------------------------------------
// This is the ORIGINAL dubolt rendering — instanced cones, UnrealBloom glow, and
// FogExp2 (which fades the far-flung projection arms so they dissolve at the
// edges instead of hard-clipping) — reproduced as closely as possible, because
// re-deriving it drifted from the reference. Only the host wiring is site-native:
// sized to its container (not the window), recoloured to the site's blue, and it
// obeys the same conventions as the rest of the 3D here:
//   • Device tier (lib/quality): renders on mid/high only; low tier + reduced
//     motion skip it (ambient, never load-bearing).
//   • The animation loop stops when the wrapper scrolls out of view.
//   • Pixel ratio capped; everything disposed on unmount.
// Replaces the wireframe icosahedron behind the Projects section.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/animations";
import { detectQualityTier, type QualityTier } from "@/lib/quality";

export function Tesseract() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tier, setTier] = useState<QualityTier | null>(null);
  const reduce = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => setTier(detectQualityTier()), []);

  useEffect(() => {
    if (tier === null || tier === "low" || reduce) return;
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

      const COUNT = tier === "high" ? 14000 : 7000;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = () => ({
        w: Math.max(1, container.clientWidth),
        h: Math.max(1, container.clientHeight),
      });
      let { w, h } = size();

      // --- scene (dubolt-exact, minus the full-window sizing) ---
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x000000, 0.011);
      const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 2000);
      // Pulled back a touch from the export's z=100 so the whole swarm fits a
      // square container (the fog fades the arms so the edges don't hard-clip).
      camera.position.set(0, 0, 115);

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
      bloom.strength = 1.6;
      bloom.radius = 0.5;
      bloom.threshold = 0;
      composer.addPass(bloom);

      // --- instanced cones (dubolt-exact) ---
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      const target = new THREE.Vector3();
      const geometry = new THREE.ConeGeometry(0.1, 0.5, 4).rotateX(Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({ color: 0x2b7bff });
      const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);

      const positions: InstanceType<typeof THREE.Vector3>[] = [];
      for (let i = 0; i < COUNT; i++) {
        positions.push(
          new THREE.Vector3(
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100,
          ),
        );
        mesh.setColorAt(i, color.setHex(0x2b7bff));
      }

      // dubolt params
      const rotSpeed = 0.8;
      const breathSpeed = 1.2;
      const scale = 50;
      const fuzz = 0.15;
      const clock = new THREE.Clock();

      const renderFrame = () => {
        const time = clock.getElapsedTime();
        const count = COUNT;
        for (let i = 0; i < COUNT; i++) {
          const edges = 32;
          const per = Math.max(1, Math.floor(count / edges));
          const edgeIndex = Math.floor(i / per) % edges;
          const edgeT = (i % per) / per;
          const v = edgeT * 2 - 1;
          const axis = edgeIndex % 4;
          const fb = Math.floor(edgeIndex / 4);
          const b1 = fb & 1 ? 1 : -1;
          const b2 = fb & 2 ? 1 : -1;
          const b3 = fb & 4 ? 1 : -1;

          let x4 = 0, y4 = 0, z4 = 0, w4 = 0;
          if (axis === 0) { x4 = v; y4 = b1; z4 = b2; w4 = b3; }
          else if (axis === 1) { x4 = b1; y4 = v; z4 = b2; w4 = b3; }
          else if (axis === 2) { x4 = b1; y4 = b2; z4 = v; w4 = b3; }
          else { x4 = b1; y4 = b2; z4 = b3; w4 = v; }

          const breath = 1 + 0.3 * Math.sin(time * breathSpeed + i * 0.0001);
          x4 *= breath; y4 *= breath; z4 *= breath; w4 *= breath;

          const a1 = time * rotSpeed;
          const c1 = Math.cos(a1), s1 = Math.sin(a1);
          const x_1 = x4 * c1 - w4 * s1;
          const w_1 = x4 * s1 + w4 * c1;
          const a2 = time * rotSpeed * 0.618;
          const c2 = Math.cos(a2), s2 = Math.sin(a2);
          const y_1 = y4 * c2 - z4 * s2;
          const z_1 = y4 * s2 + z4 * c2;
          const a3 = time * rotSpeed * 0.382;
          const c3 = Math.cos(a3), s3 = Math.sin(a3);
          const X_f = x_1 * c3 - y_1 * s3;
          const Y_f = x_1 * s3 + y_1 * c3;
          const Z_f = z_1;
          const W_f = w_1;

          const pX = X_f + Math.sin(i * 1.3 + time) * fuzz;
          const pY = Y_f + Math.cos(i * 1.7 - time) * fuzz;
          const pZ = Z_f + Math.sin(i * 2.1 + time * 1.2) * fuzz;

          const wFactor = 1.0 / (4.0 - W_f + 0.0001);
          target.set(pX * wFactor * scale, pY * wFactor * scale, pZ * wFactor * scale);

          // Recoloured to the site's blue (was a rainbow HSL): a single hue, just
          // brightening with the projection depth.
          const lum = Math.min(Math.max(0.2 + wFactor * 0.6, 0.12), 1);
          color.setHSL(0.58 + W_f * 0.03, 0.85, lum);

          positions[i].lerp(target, 0.1);
          dummy.position.copy(positions[i]);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          mesh.setColorAt(i, color);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        composer.render();
      };

      // --- loop, gated by visibility ---
      let raf = 0;
      let running = false;
      const loop = () => {
        renderFrame();
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

      const io = new IntersectionObserver(
        ([e]) => (e.isIntersecting ? start() : stop()),
        { threshold: 0 },
      );
      io.observe(container);

      const ro = new ResizeObserver(() => {
        const s = size();
        w = s.w;
        h = s.h;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        composer.setSize(w, h);
      });
      ro.observe(container);

      start();

      cleanup = () => {
        stop();
        io.disconnect();
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
  }, [tier, reduce]);

  return <div ref={containerRef} aria-hidden className="h-full w-full" />;
}
