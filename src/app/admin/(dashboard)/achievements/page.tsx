import type { AchievementsContent } from "@/lib/content-types";
import { getSectionForAdmin } from "@/lib/content-admin";
import { AchievementsForm } from "@/components/admin/forms/AchievementsForm";

export default async function Page() {
  const initial = await getSectionForAdmin<AchievementsContent>("achievements");
  return <AchievementsForm initial={initial} />;
}
