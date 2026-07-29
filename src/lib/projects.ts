// -----------------------------------------------------------------------------
// Projects data
// -----------------------------------------------------------------------------
// Single source of truth for the Projects marquee. `image` is optional: when a
// real screenshot exists later, add its path here and ThumbnailCard renders it
// instead of the colored placeholder — no structural change needed.
// -----------------------------------------------------------------------------

export type Project = {
  /** Two-digit display index ("01"…). */
  num: string;
  name: string;
  description: string;
  stack: string[];
  /** Full GitHub URL. */
  repo: string;
  /** Optional real screenshot path (public/...) — swaps in when provided. */
  image?: string;
};

export const PROJECTS: Project[] = [
  {
    num: "01",
    name: "LeadUnity",
    description: "Leading University's defense setup",
    stack: ["Flutter", "Dart", "NextJS"],
    repo: "https://github.com/arifhaxn/lead_unity",
  },
  {
    num: "02",
    name: "OnePick",
    description: "One Piece trivia app to find your character",
    stack: ["C++", "Dart"],
    repo: "https://github.com/arifhaxn/one_pick",
  },
  {
    num: "03",
    name: "Chessy",
    description: "Chess timer app for all variations",
    stack: ["Flutter", "Dart"],
    repo: "https://github.com/arifhaxn/chessy",
  },
  {
    num: "04",
    name: "Claster",
    description: "Class scheduling app for teachers",
    stack: ["Flutter", "Dart", "Firebase"],
    repo: "https://github.com/arifhaxn/Claster",
  },
  {
    num: "05",
    name: "OneTELE",
    description: "Custom teleprompter for Liilab's studio",
    stack: ["Flutter", "Dart"],
    repo: "https://github.com/arifhaxn/OneTELE---Liilab-Teleprompter",
  },
  {
    num: "06",
    name: "Career Logic AI",
    description: "AI-powered CV management & assessment",
    stack: ["Dart", "Groq"],
    repo: "https://github.com/arifhaxn/CareerLogic-AI",
  },
];
