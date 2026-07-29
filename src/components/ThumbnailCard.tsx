// -----------------------------------------------------------------------------
// ThumbnailCard
// -----------------------------------------------------------------------------
// The per-project thumbnail. Today every project renders the placeholder branch:
// a dark card in the site's palette (near-black gradient, ghost mono index, a
// single blue accent line) — deliberately quiet, since the name/description/
// stack/link live in the detail panel next to it. Once a real screenshot exists,
// setting `image` on the project in lib/projects.ts flips it to the <Image>
// branch — a data change, not a structural rework.
// -----------------------------------------------------------------------------

import Image from "next/image";
import type { Project } from "@/lib/projects";

export function ThumbnailCard({ project }: { project: Project }) {
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
