// -----------------------------------------------------------------------------
// ThumbnailCard
// -----------------------------------------------------------------------------
// The per-project thumbnail, in priority order:
//   1. `logo`  — an app icon / mark, shown CONTAINED + padded on the dark card
//                (transparent logos aren't cropped, they sit centered).
//   2. `image` — a full screenshot, shown COVER-cropped edge to edge.
//   3. neither — the quiet placeholder: near-black gradient, ghost mono index,
//                a single blue accent line.
// All three keep the same card footprint, so which one shows is a pure data
// choice in lib/projects.ts — no structural rework.
// -----------------------------------------------------------------------------

import Image from "next/image";
import type { Project } from "@/lib/projects";
import { CircuitBackground } from "@/components/CircuitBackground";

export function ThumbnailCard({ project }: { project: Project }) {
  if (project.logo) {
    return (
      <div
        // `--accent` (the logo's dominant color) tints the glow + matrix layers.
        style={{ "--accent": project.accent ?? "#3b82f6" } as React.CSSProperties}
        className="group relative flex h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black ring-1 ring-white/10 transition-[transform,box-shadow] duration-500 ease-out hover:-translate-y-1 hover:ring-white/25 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)]"
      >
        {/* Breathing accent spotlight behind the logo. */}
        <div aria-hidden className="thumb-glow pointer-events-none absolute inset-0" />
        {/* Live circuit board, tinted to the accent; center masked so the logo
            stays clean on top. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            WebkitMaskImage:
              "radial-gradient(circle at center, transparent 64px, #000 112px)",
            maskImage:
              "radial-gradient(circle at center, transparent 64px, #000 112px)",
          }}
        >
          <CircuitBackground
            accent={project.accent}
            variant={Number.parseInt(project.num, 10) - 1}
          />
        </div>
        {/* Brighter accent spotlight, faded in on hover. */}
        <div
          aria-hidden
          className="thumb-glow-strong pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
        {/* Diagonal sheen that sweeps across on hover. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[350%]"
        />
        {/* Logo: idle float + a lift/scale on hover. */}
        <div className="thumb-float relative">
          <Image
            src={project.logo}
            alt={`${project.name} logo`}
            width={160}
            height={160}
            sizes="128px"
            className="h-32 w-32 object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.55)] transition-transform duration-500 ease-out group-hover:scale-110"
          />
        </div>
      </div>
    );
  }

  if (project.image) {
    return (
      <div className="relative h-40 w-full overflow-hidden rounded-xl ring-1 ring-white/10">
        <Image
          src={project.image}
          alt={`${project.name} screenshot`}
          fill
          sizes="(min-width: 1024px) 24rem, 100vw"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-40 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black ring-1 ring-white/10">
      {/* Ghost index — the card's only label; the name lives in the detail panel. */}
      <span className="font-mono text-6xl font-semibold tracking-tight text-white/10">
        {project.num}
      </span>
      {/* Blue accent detail, consistent with the site's Pose-B / link accent. */}
      <span aria-hidden className="h-px w-10 bg-blue-500" />
    </div>
  );
}
