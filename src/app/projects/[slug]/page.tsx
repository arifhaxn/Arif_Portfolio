// -----------------------------------------------------------------------------
// /projects/[slug] — project case-study page
// -----------------------------------------------------------------------------
// One page per project (all 6 slugs known at build via generateStaticParams).
// Arriving here plays the shared <PixelReveal> route transition, then the page
// body (ProjectCaseStudy) presents: a constant overview title + metadata, the
// scroll-scrubbed pixelated hero window, and the zoom-in gallery.
// -----------------------------------------------------------------------------

import { notFound } from "next/navigation";
import { PROJECTS } from "@/lib/projects";
import { ProjectCaseStudy } from "@/components/ProjectCaseStudy";
import { NextProjectChain } from "@/components/NextProjectChain";

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
      <ProjectCaseStudy project={project} />
      <NextProjectChain currentSlug={project.slug} />
    </main>
  );
}
