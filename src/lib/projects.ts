// -----------------------------------------------------------------------------
// Projects data
// -----------------------------------------------------------------------------
// Single source of truth for the Projects marquee. Two optional thumbnail
// sources, both under public/: `logo` (an app icon / mark — rendered CONTAINED
// on the dark card) and `image` (a full screenshot — rendered COVER). When
// neither is set, ThumbnailCard falls back to the ghost-index placeholder.
// -----------------------------------------------------------------------------

export type Project = {
  /** Two-digit display index ("01"…). */
  num: string;
  /** Kebab-case URL slug for the case-study route (/projects/[slug]). */
  slug: string;
  name: string;
  description: string;
  stack: string[];
  /** Full GitHub URL. */
  repo: string;
  /** Optional project logo/icon path (public/...) — shown contained + padded. */
  logo?: string;
  /** Dominant logo color (hex) — tints the card's glow + matrix pixel effect. */
  accent?: string;
  /** Hex color for this project's next-project loading ring (cosmetic). */
  themeColor?: string;
  /** Optional real screenshot path (public/...) — shown cover-cropped. */
  image?: string;
  /** Case-study hero image (public/...) — the scroll-scrubbed pixelated window. */
  heroImage?: string;
  /** Case-study gallery: stacked screenshots, each with a caption. */
  gallery?: { src: string; caption: string }[];
  /** Overview "Role" line. */
  role?: string;
  /** Overview "Year" line. */
  year?: string;
  /** Optional live/demo URL — the overview link points here when set (else repo). */
  liveUrl?: string;
};

export const PROJECTS: Project[] = [
  {
    num: "01",
    slug: "lead-unity",
    name: "LeadUnity",
    description: "Leading University's defense setup",
    stack: ["Flutter", "Dart", "NextJS"],
    repo: "https://github.com/arifhaxn/lead_unity",
    logo: "/projects/leadunity.png",
    accent: "#22b14c",
    themeColor: "#22c55e",
    heroImage: "/projects/lead-unity/hero.png",
    role: "Design & Development",
    year: "2024", // ⚠ placeholder year — confirm/replace
    gallery: [
      { src: "/projects/leadunity/student-ui.png", caption: "Student UI" },
      { src: "/projects/leadunity/student-dashboard.png", caption: "Student dashboard" },
      { src: "/projects/leadunity/supervisor-ui.png", caption: "Supervisor UI" },
      { src: "/projects/leadunity/supervisor-dashboard.png", caption: "Supervisor dashboard" },
      { src: "/projects/leadunity/admin-panel.png", caption: "Admin panel" },
      { src: "/projects/leadunity/assistant.png", caption: "LeadUnity assistant" },
      { src: "/projects/leadunity/push-notifications.png", caption: "Push notifications" },
      { src: "/projects/leadunity/light-dark-mode.png", caption: "Light & dark mode" },
    ],
  },
  {
    num: "02",
    slug: "one-pick",
    name: "OnePick",
    description: "One Piece trivia app to find your character",
    stack: ["C++", "Dart"],
    repo: "https://github.com/arifhaxn/one_pick",
    logo: "/projects/onepick.png",
    accent: "#f0a91c",
    themeColor: "#f0a91c",
  },
  {
    num: "03",
    slug: "chessy",
    name: "Chessy",
    description: "Chess timer app for all variations",
    stack: ["Flutter", "Dart"],
    repo: "https://github.com/arifhaxn/chessy",
    logo: "/projects/chessy.png",
    accent: "#e3d2a8",
    themeColor: "#e0b23c",
  },
  {
    num: "04",
    slug: "claster",
    name: "Claster",
    description: "Class scheduling app for teachers",
    stack: ["Flutter", "Dart", "Firebase"],
    repo: "https://github.com/arifhaxn/Claster",
    logo: "/projects/claster.png",
    accent: "#f05a28",
    themeColor: "#f0562a",
  },
  {
    num: "05",
    slug: "one-tele",
    name: "OneTELE",
    description: "Custom teleprompter for Liilab's studio",
    stack: ["Flutter", "Dart"],
    repo: "https://github.com/arifhaxn/OneTELE---Liilab-Teleprompter",
    logo: "/projects/onetele.png",
    accent: "#6d28d9",
    themeColor: "#8b5cf6",
  },
  {
    num: "06",
    slug: "career-logic-ai",
    name: "Career Logic AI",
    description: "AI-powered CV management & assessment",
    stack: ["Dart", "Groq"],
    repo: "https://github.com/arifhaxn/CareerLogic-AI",
    logo: "/projects/careerlogic.png",
    accent: "#4f5aa8",
    themeColor: "#5b6cc4",
  },
];

/** The next project in sequence, looping back to the first after the last. */
export function nextProject(slug: string): Project {
  const i = PROJECTS.findIndex((p) => p.slug === slug);
  return PROJECTS[(i + 1) % PROJECTS.length];
}
