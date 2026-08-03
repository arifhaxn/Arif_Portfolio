// -----------------------------------------------------------------------------
// About / contact data
// -----------------------------------------------------------------------------
// Single source of truth for the /about page's skills, socials, contact email
// and the contact marquee tags. Kept here (not in the component) so copy edits
// don't touch layout code.
// -----------------------------------------------------------------------------

export const CONTACT_EMAIL = "arifhasan.connect@gmail.com";

/** Skill groups — each renders as a big-title block on /about. */
export const SKILLS: { label: string; items: string[] }[] = [
  { label: "Languages", items: ["Dart", "C++", "Python"] },
  { label: "Frontend", items: ["Flutter"] },
  { label: "Backend", items: ["Node.js"] },
  { label: "Database", items: ["Firebase", "MongoDB"] },
  { label: "Infra", items: ["Vercel", "Docker", "Git"] },
  { label: "Tools", items: ["VS Code", "Android Studio", "Figma"] },
];

export const SOCIALS: { label: string; href: string }[] = [
  { label: "GitHub", href: "https://github.com/arifhaxn" },
  { label: "LinkedIn", href: "https://linkedin.com/in/arif-hasan-672249358" },
  { label: "Instagram", href: "https://instagram.com/arifhaxn" },
  { label: "Facebook", href: "https://facebook.com/arifhaxnn" },
];

/** Scrolling contact-ribbon tags. ⚠ tweak freely — these are just vibe copy. */
export const CONTACT_TAGS = [
  "Tell me what you're building",
  "Remote-friendly",
  "Replies within 48 hours",
  "Timezone: Dhaka (GMT+6)",
  "Open to collaborations",
];
