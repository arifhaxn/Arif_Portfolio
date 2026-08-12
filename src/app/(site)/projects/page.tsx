// -----------------------------------------------------------------------------
// /projects — the projects marquee on its own route
// -----------------------------------------------------------------------------
// Moved off the home page so the landing stays a single screen. Nav "Projects"
// links here. The <Projects> section component is unchanged (desktop pinned
// scroll-scrub marquee; mobile plain reveals).
// -----------------------------------------------------------------------------

import { Projects } from "@/components/Projects";
import { getProjects } from "@/lib/content";

export default async function ProjectsPage() {
  const { items } = await getProjects();
  return (
    <main className="flex flex-1 flex-col bg-black">
      <Projects projects={items} />
    </main>
  );
}
