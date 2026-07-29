// -----------------------------------------------------------------------------
// simplify-robot — adaptive triangle reduction for public/robot.glb
// -----------------------------------------------------------------------------
// Usage: node scripts/simplify-robot.mjs [ratio] [error]
//   ratio — target fraction of triangles to keep (default 0.21 ≈ 50K of 237K)
//   error — max deviation as a fraction of mesh radius (default 0.01 = 1%)
//
// Reads public/robot-backup.glb (the pristine original), writes public/robot.glb.
//
// Why the attribute stripping: the scan export is fully unindexed — every
// triangle corner has its own vertex with unique normals/UVs, and the
// simplifier refuses to collapse across attribute seams, so on the raw file it
// can only remove ~0.15% of triangles. The site renders a position-only
// wireframe (normals/UVs/materials are discarded at load), so dropping those
// attributes here is lossless for our use — and it lets weld() rebuild true
// topology, giving meshoptimizer's quadric-error simplifier real freedom to
// work adaptively (keep detail where curvature is high, cut hard where flat).
// -----------------------------------------------------------------------------

import { NodeIO } from "@gltf-transform/core";
import { prune, simplify, weld } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";

const ratio = Number(process.argv[2] ?? 0.21);
const error = Number(process.argv[3] ?? 0.01);

const io = new NodeIO();
const doc = await io.read("public/robot-backup.glb");

// Strip everything except positions: normals/UVs cause the vertex splits that
// block simplification, and materials/textures are unused by the wireframe.
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    for (const semantic of prim.listSemantics()) {
      if (semantic !== "POSITION") prim.setAttribute(semantic, null);
    }
    prim.setMaterial(null);
  }
}

await doc.transform(
  prune(), // drop the now-orphaned accessors, materials, textures, images
  weld(), // merge position-identical vertices → real topology
  simplify({ simplifier: MeshoptSimplifier, ratio, error }),
);

await io.write("public/robot.glb", doc);

// Report the result.
let tris = 0,
  verts = 0;
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    verts += prim.getAttribute("POSITION").getCount();
    const idx = prim.getIndices();
    tris += (idx ? idx.getCount() : prim.getAttribute("POSITION").getCount()) / 3;
  }
}
console.log(`ratio=${ratio} error=${error} → tris=${tris.toLocaleString()} verts=${verts.toLocaleString()}`);
