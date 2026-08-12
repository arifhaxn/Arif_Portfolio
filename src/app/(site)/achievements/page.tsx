// -----------------------------------------------------------------------------
// /achievements — server entry
// -----------------------------------------------------------------------------
// Reads the certificate board's content from Firestore (content/achievements)
// server-side via firebase-admin, then hands it to <AchievementsView> (the client
// component that owns the pan/warp/intro behavior). Plumbing split only — the
// rendered page is identical to before.
// -----------------------------------------------------------------------------

import { AchievementsView } from "@/components/AchievementsView";
import { getAchievements } from "@/lib/content";

export default async function AchievementsPage() {
  const content = await getAchievements();
  return <AchievementsView content={content} />;
}
