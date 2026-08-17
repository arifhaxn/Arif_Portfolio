"use client";

// -----------------------------------------------------------------------------
// Tesseract — breathing 4D hypercube (faithful port of the dubolt export)
// -----------------------------------------------------------------------------
// A close port of the ORIGINAL dubolt rendering (see /dubolt.html — the cone +
// flat-material variant, NOT the sphere/metallic one), reproduced rather than
// re-derived so it matches the reference recording:
//   • instanced ConeGeometry(0.1, 0.5, 4) + flat MeshBasicMaterial (0x00aaff),
//   • the exact 32-edge tesseract enumeration, 3-plane 4D rotation, breathing,
//     fuzz jitter and stereographic projection, verbatim,
//   • UnrealBloom (strength 1.8, radius 0.4, threshold 0) — most of the neon
//     glow comes from here,
//   • FogExp2(0x000000, 0.01) — fades the far projection arms so the swarm
//     dissolves at the edges instead of hard-clipping its container,
//   • the persistent positions array, lerped toward each target every frame
//     (positions[i].lerp(target, 0.1)) — the trailing/fluid feel; built once and
//     mutated in place, never recreated.
// (The dubolt.js sandbox's duplicate `let THREE_LIB` decl is a genuine syntax
// error and is simply not reproduced.)
//
// Only the host wiring is site-native: bloom via raw three (its UnrealBloomPass
// gives the exact strength/radius/threshold the reference used); sized to its
// container with a ResizeObserver; auto-rotate only (no OrbitControls — it sits
// behind readable content); tier-gated (mid/high; low tier skips it, mobile is
// already dropped by the `hidden lg:block` wrapper in Projects); the loop stops
// off-screen; reduced motion renders a single STATIC resolved frame; disposed on
// unmount. Replaces the wireframe icosahedron behind the Projects section.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/animations";
import { detectQualityTier, type QualityTier } from "@/lib/quality";
import { SWARM_COUNT } from "@/lib/motion";

export function Tesseract() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tier, setTier] = useState<QualityTier | null>(null);
  const reduce = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => setTier(detectQualityTier()), []);

  useEffect(() => {
    if (tier === null || tier === "low") return;
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

      const COUNT = tier === "high" ? SWARM_COUNT : Math.round(SWARM_COUNT * 0.6);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = () => ({
        w: Math.max(1, container.clientWidth),
        h: Math.max(1, container.clientHeight),
      });
      let { w, h } = size();

      // --- scene (dubolt-exact) ---
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x000000, 0.01);
      const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 2000);
      camera.position.set(0, 0, 80); // closer than the source's 100 → bigger in frame

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
      bloom.strength = 2.0; // a touch brighter glow
      bloom.radius = 0.4;
      bloom.threshold = 0;
      composer.addPass(bloom);

      // --- instanced cones (dubolt-exact) ---
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      const target = new THREE.Vector3();
      const geometry = new THREE.ConeGeometry(0.1, 0.5, 4).rotateX(Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff }); // white (no blue tint)
      const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);

      // persistent positions — built ONCE, mutated in place (the trailing feel)
      const positions: InstanceType<typeof THREE.Vector3>[] = [];
      for (let i = 0; i < COUNT; i++) {
        positions.push(
          new THREE.Vector3(
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 100,
          ),
        );
        mesh.setColorAt(i, color.setHex(0x00ff88));
      }

      // dubolt params
      const rotSpeed = 0.8;
      const breathSpeed = 1.2;
      const scale = 54; // slightly larger projection
      const fuzz = 0.18;
      const clock = new THREE.Clock();
      const animated = !reduce;

      // `snap` true = reduced-motion static frame: use time 0 and place particles
      // directly on their rest targets (no rotation/breathing/trailing).
      const renderFrame = (snap: boolean) => {
        const time = snap ? 0 : clock.getElapsedTime();
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

          // White with a faint cool tint (low saturation), brighter than the
          // source; the projection factor still drives the luminance variation.
          const hue = 0.58 + W_f * 0.05;
          const lum = Math.min(Math.max(0.55 + wFactor * 0.55, 0.4), 1);
          color.setHSL(Math.abs(hue % 1.0), 0.18, lum);

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
        if (!animated) renderFrame(true); // keep the static frame correct on resize
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
        renderFrame(true); // one static resolved frame under reduced motion
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
  }, [tier, reduce]);

  return <div ref={containerRef} aria-hidden className="h-full w-full" />;
}
