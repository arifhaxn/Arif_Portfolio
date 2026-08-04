// -----------------------------------------------------------------------------
// /projects/[slug] — project case-study page
// -----------------------------------------------------------------------------
// One page per project (all 6 slugs known at build via generateStaticParams).
// Phase 1 scope: the entry moment only — the pixel-reveal route transition (from
// the shared <PixelReveal> in the root layout) uncovers the big centered project
// name, which holds and then shrinks into a persistent top-left header. The
// content area below is intentionally empty; Phase 2 fills it with the
// pixel-reveal image + metadata sections.
// -----------------------------------------------------------------------------

import { notFound } from "next/navigation";
import { PROJECTS } from "@/lib/projects";
import { ProjectTitleReveal } from "@/components/ProjectTitleReveal";
import { ProjectCaseStudy } from "@/components/ProjectCaseStudy";

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) notFound();

  return (
    <main className="relative min-h-screen bg-black text-white">
      {/* Entry title → persistent top-left header. */}
      <ProjectTitleReveal name={project.name} />

      {/* Case-study body: pinned pixelated hero window, about info, gallery. */}
      <ProjectCaseStudy project={project} />
    </main>
  );
}
