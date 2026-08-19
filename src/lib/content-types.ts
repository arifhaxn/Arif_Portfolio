// -----------------------------------------------------------------------------
// Content types — the shape of every Firestore `content/*` document
// -----------------------------------------------------------------------------
// One interface per page/section document (see lib/content.ts for the reads and
// scripts/migrate-to-firestore.ts for the seed). These are the CONTENT strings
// and structured data that a person would edit — NOT design/behavior (animation
// timings, layout, color tokens, which elements scramble, etc.), which all stay
// in the component code exactly as before.
//
// This file is deliberately NOT `server-only`: Client Components receive these as
// props, so they import the TYPES from here (types are erased at build). The
// server-only Firestore reads live in lib/content.ts.
//
// The structured item shapes (Project, CareerEntry, Achievement) are kept exactly
// as they were and just re-exported here — only relocated, never redesigned.
// -----------------------------------------------------------------------------

import type { Project } from "@/lib/projects";
import type { CareerEntry } from "@/lib/career";
import type { Achievement, AchievementCategory } from "@/lib/achievements";

export type { Project, CareerEntry, Achievement, AchievementCategory };

// Firestore note: documents must not contain arrays-of-arrays. Any "list of
// lists" is therefore modelled as a list of objects that each hold an array
// (e.g. HeadingLine below).

// --- content/navbar ----------------------------------------------------------
export interface NavLink {
  label: string;
  href: string;
  /** Which corner of the navbar this link sits in. */
  side: "left" | "right";
}
export interface NavbarContent {
  wordmark: { logo: string; alt: string; homeAriaLabel: string };
  links: NavLink[];
}

// --- content/hero (landing + shared identity reused on the About hero) --------
export interface HeroContent {
  /** Small mono eyebrow above the name, e.g. "/ Full-Stack Developer". */
  eyebrow: string;
  /** Full name; rendered one word per line (whitespace-split) as before. */
  name: string;
  /** Mid-right two-line status block on the landing. */
  tagline: { primary: string; secondary: string };
  /** Landing "Get in touch" button label. */
  ctaLabel: string;
  /** Halftone-portrait source (used by the About hero). */
  portraitImage: string;
  hud: {
    /** Rotating status words in the live clock, e.g. BUILDING / LEARNING / SHIPPING. */
    statusWords: string[];
    /** Bottom-right "coding since" year. */
    codingSinceYear: string;
    /** Clock location label, e.g. "Sylhet / GMT+6". */
    locationLabel: string;
    /** IANA timezone the live clock reads, e.g. "Asia/Dhaka". */
    timeZone: string;
  };
}

// --- content/about -----------------------------------------------------------
export interface HeadingSegment {
  text: string;
  /** Renders in the blue accent color when true (the "code"/"craft" words). */
  accent?: boolean;
}
/** One line of the description headline (a <br/>-separated run of segments). */
export interface HeadingLine {
  segments: HeadingSegment[];
}
export interface SkillGroup {
  label: string;
  items: string[];
}
/** One row of the About profile readout: a mono label and its value. */
export interface ProfileFact {
  label: string;
  value: string;
}
export interface AboutContent {
  /** Segmented, multi-line description headline (preserves the blue accents). */
  descriptionHeading: HeadingLine[];
  /** Bio paragraph under the headline. */
  bio: string;
  /** Profile readout rows under the description headline. Optional: existing
   *  Firestore documents predate it, so the About section falls back to a seeded
   *  default (see PROFILE_FALLBACK in AboutView) until it's filled in from the
   *  admin. Set it there and it takes over completely. */
  profile?: ProfileFact[];
  /** Skills section eyebrow, e.g. "— Skills". */
  skillsEyebrow: string;
  skills: SkillGroup[];
  /** Right-side HUD on the About hero. */
  heroStatus: {
    location: string;
    availability: string;
    timeZone: string;
    scrollCue: string;
  };
}

// --- content/career ----------------------------------------------------------
export interface CareerContent {
  /** Section eyebrow, e.g. "— Career". */
  eyebrow: string;
  items: CareerEntry[];
}

// --- content/projects --------------------------------------------------------
/** Static copy for the case-study pages (labels/CTAs, not the project data). */
export interface CaseStudyCopy {
  overviewLabel: string;
  metaLabels: { role: string; year: string; stack: string; note: string };
  viewRepository: string;
  launchWebsite: string;
  githubLabel: string;
  scrollCue: string;
  heroPlaceholder: string;
  galleryPlaceholder: string;
  nextProjectLabel: string;
}
export interface ProjectsContent {
  items: Project[];
  caseStudy: CaseStudyCopy;
}

// --- content/achievements ----------------------------------------------------
export interface AchievementsContent {
  eyebrow: string;
  heading: string;
  subtitle: string;
  /** Display order of the category sections. */
  categoryOrder: AchievementCategory[];
  items: Achievement[];
}

// --- content/footer (the contact area on /about) -----------------------------
export interface SocialLink {
  label: string;
  href: string;
  /** 24×24 brand glyph SVG path (fill=currentColor). */
  icon: string;
}
export interface FooterContent {
  eyebrow: string;
  note: string;
  email: string;
  /** Scrolling contact-ribbon tags. */
  tags: string[];
  copyLabel: string;
  copiedLabel: string;
  socialLinks: SocialLink[];
  /** Two-line sign-off, e.g. ["Arif Hasan", "Full-Stack Dev"]. */
  signoff: string[];
}
