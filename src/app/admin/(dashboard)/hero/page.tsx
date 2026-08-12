import type { HeroContent } from "@/lib/content-types";
import { getSectionForAdmin } from "@/lib/content-admin";
import { HeroForm } from "@/components/admin/forms/HeroForm";

export default async function Page() {
  const initial = await getSectionForAdmin<HeroContent>("hero");
  return <HeroForm initial={initial} />;
}
