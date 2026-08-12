// -----------------------------------------------------------------------------
// /projects/[slug] — project case-study page
// -----------------------------------------------------------------------------
// One page per project (all slugs known at build via generateStaticParams, now
// sourced from Firestore). Arriving here plays the shared <PixelReveal> route
// transition, then the page body (ProjectCaseStudy) presents: a constant overview
// title + metadata, the scroll-scrubbed pixelated hero window, and the zoom-in
// gallery. The projects list + case-study copy come from content/projects.
// -----------------------------------------------------------------------------

import { notFound } from "next/navigation";
import { getProjects } from "@/lib/content";
import { nextProject } from "@/lib/projects";
import { ProjectCaseStudy } from "@/components/ProjectCaseStudy";
import { NextProjectChain } from "@/components/NextProjectChain";

export async function generateStaticParams() {
  const { items } = await getProjects();
  return items.map((p) => ({ slug: p.slug }));
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { items, caseStudy } = await getProjects();
  const project = items.find((p) => p.slug === slug);
  if (!project) notFound();

  const next = nextProject(items, project.slug);

  return (
    <main className="relative min-h-screen bg-black text-white">
      <ProjectCaseStudy project={project} copy={caseStudy} />
      <NextProjectChain next={next} label={caseStudy.nextProjectLabel} />
    </main>
  );
}
