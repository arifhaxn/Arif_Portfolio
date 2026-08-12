import type { ProjectsContent } from "@/lib/content-types";
import { getSectionForAdmin } from "@/lib/content-admin";
import { ProjectsForm } from "@/components/admin/forms/ProjectsForm";

export default async function Page() {
  const initial = await getSectionForAdmin<ProjectsContent>("projects");
  return <ProjectsForm initial={initial} />;
}
