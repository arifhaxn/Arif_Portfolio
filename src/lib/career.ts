// -----------------------------------------------------------------------------
// Career / experience timeline data
// -----------------------------------------------------------------------------
// Ordered top→bottom. Each entry's branch peels off the central trunk toward its
// `side` (desktop alternates left/right; mobile ignores side and stacks). The
// connector line is drawn from these in <Career>.
//
// ⚠ PLACEHOLDER: every entry below is a stand-in — no real company names or roles
// are invented. Replace `company` / `title` / `description` / `period` (and add a
// `logo` under public/) with the owner's real history before shipping.
// -----------------------------------------------------------------------------

export type CareerEntry = {
  /** Company / organization name. */
  company: string;
  /** Optional logo path (public/...). Falls back to a lettermark placeholder. */
  logo?: string;
  /** Role / job title. */
  title: string;
  /** One- to two-line summary of the role. */
  description: string;
  /** Human-readable date range, e.g. "2023 — Present". */
  period: string;
  /** Which side of the trunk this entry's branch reaches (desktop only). */
  side: "left" | "right";
};

// ⚠ Placeholder entries — replace with real experience.
export const CAREER: CareerEntry[] = [
  {
    company: "Company One", // ⚠ placeholder
    title: "Full-Stack Developer",
    description:
      "Placeholder summary — what you built, the stack, and the impact. Replace with a real one- to two-line description.",
    period: "2024 — Present", // ⚠ placeholder
    side: "left",
  },
  {
    company: "Company Two", // ⚠ placeholder
    title: "Mobile App Developer",
    description:
      "Placeholder summary — Flutter/Dart product work, features owned, and outcomes. Replace with real copy.",
    period: "2023 — 2024", // ⚠ placeholder
    side: "right",
  },
  {
    company: "Company Three", // ⚠ placeholder
    title: "Software Engineering Intern",
    description:
      "Placeholder summary — early experience, tools learned, and what you contributed. Replace with real copy.",
    period: "2022 — 2023", // ⚠ placeholder
    side: "left",
  },
  {
    company: "Company Four", // ⚠ placeholder
    title: "Freelance Developer",
    description:
      "Placeholder summary — client projects and the range of work delivered. Replace with real copy.",
    period: "2021 — 2022", // ⚠ placeholder
    side: "right",
  },
];
