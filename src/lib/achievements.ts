// -----------------------------------------------------------------------------
// Achievements data
// -----------------------------------------------------------------------------
// Single source of truth for the /achievements grid. Same pattern as
// lib/projects.ts: `image` is optional, so when a real certificate scan exists
// later, drop its path + real `title`/`issuer` in here and AchievementCard
// renders the real thing instead of the placeholder shell — no component change.
//
// Certificates are grouped into CATEGORIES (Hackathons, Courses, …); the page
// renders one labelled section per category, in CATEGORIES order.
//
// ⚠ PLACEHOLDERS — every entry below is an intentional placeholder. Titles and
// issuers are generic slot labels, NOT invented real credentials. Replace each
// with a genuine certificate (and add its `image`) as they're supplied.
// -----------------------------------------------------------------------------

export type AchievementCategory =
  | "Hackathons"
  | "Courses"
  | "Volunteering"
  | "Research";

/** Display order of the category sections. */
export const CATEGORIES: AchievementCategory[] = [
  "Hackathons",
  "Research",
  "Volunteering",
  "Courses",
];

export type Achievement = {
  /** Stable id (also the display index source), unique across all categories. */
  id: string;
  /** Certificate title. ⚠ placeholder until a real one is provided. */
  title: string;
  /** Issuing body / platform. ⚠ placeholder until provided. */
  issuer: string;
  /** Which section this certificate belongs to. */
  category: AchievementCategory;
  /** Optional real certificate image path (public/...) — swaps in when set. */
  image?: string;
};

// Placeholder slots per category. Kept generic so nothing reads as a real,
// invented credential.
export const ACHIEVEMENTS: Achievement[] = [
  { id: "01", title: "Hackathon Certificate 01", issuer: "Organizer / Event", category: "Hackathons" },
  { id: "02", title: "Hackathon Certificate 02", issuer: "Organizer / Event", category: "Hackathons" },
  { id: "03", title: "Hackathon Certificate 03", issuer: "Organizer / Event", category: "Hackathons" },
  { id: "04", title: "Hackathon Certificate 04", issuer: "Organizer / Event", category: "Hackathons" },

  { id: "05", title: "Course Certificate 05", issuer: "Issuer / Platform", category: "Courses" },
  { id: "06", title: "Course Certificate 06", issuer: "Issuer / Platform", category: "Courses" },
  { id: "07", title: "Course Certificate 07", issuer: "Issuer / Platform", category: "Courses" },
  { id: "08", title: "Course Certificate 08", issuer: "Issuer / Platform", category: "Courses" },

  { id: "09", title: "Volunteering Certificate 09", issuer: "Organization", category: "Volunteering" },
  { id: "10", title: "Volunteering Certificate 10", issuer: "Organization", category: "Volunteering" },
  { id: "11", title: "Volunteering Certificate 11", issuer: "Organization", category: "Volunteering" },

  { id: "12", title: "Research Certificate 12", issuer: "Journal / Institution", category: "Research" },
  { id: "13", title: "Research Certificate 13", issuer: "Journal / Institution", category: "Research" },
  { id: "14", title: "Research Certificate 14", issuer: "Journal / Institution", category: "Research" },
];

/**
 * Group achievements by category, in the given display order (empties dropped).
 * Pure over its inputs so it works with the Firestore-sourced items + category
 * order at runtime and the seed arrays during migration alike.
 */
export function groupByCategory(
  items: Achievement[],
  order: AchievementCategory[],
): { category: AchievementCategory; items: Achievement[] }[] {
  return order
    .map((category) => ({
      category,
      items: items.filter((a) => a.category === category),
    }))
    .filter((g) => g.items.length > 0);
}
