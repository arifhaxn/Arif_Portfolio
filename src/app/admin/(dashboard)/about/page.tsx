import type { AboutContent } from "@/lib/content-types";
import { getSectionForAdmin } from "@/lib/content-admin";
import { AboutForm } from "@/components/admin/forms/AboutForm";

export default async function Page() {
  const initial = await getSectionForAdmin<AboutContent>("about");
  return <AboutForm initial={initial} />;
}
