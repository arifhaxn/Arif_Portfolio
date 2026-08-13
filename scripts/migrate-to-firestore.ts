// -----------------------------------------------------------------------------
// One-time migration: seed Firestore `content/*` from the current hardcoded site
// -----------------------------------------------------------------------------
// Run ONCE, manually, after filling in .env.local with the service account:
//
//   npm run migrate:firestore
//     (or: npx tsx scripts/migrate-to-firestore.ts)
//
// It writes one document per page/section, populated with the EXACT values that
// are live on the site today — the existing lib/projects.ts, lib/career.ts,
// lib/achievements.ts and lib/about.ts arrays, plus the page copy found in the
// component audit. Nothing is reset to a placeholder; this faithfully carries
// over what's already there so the public pages render identically once they
// read from Firestore instead of these constants.
//
// Safe to re-run: each doc is written with set() (full overwrite of that doc),
// so re-running re-seeds from source without creating duplicates.
// -----------------------------------------------------------------------------

import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Seed data — the current single sources of truth (relocated, never redesigned).
import { PROJECTS } from "../src/lib/projects";
import { CAREER } from "../src/lib/career";
import { ACHIEVEMENTS, CATEGORIES } from "../src/lib/achievements";
import { CONTACT_EMAIL, CONTACT_TAGS, SKILLS, SOCIALS } from "../src/lib/about";
import type {
  NavbarContent,
  HeroContent,
  AboutContent,
  CareerContent,
  ProjectsContent,
  AchievementsContent,
  FooterContent,
} from "../src/lib/content-types";

// Load service account creds from .env.local (not just .env).
config({ path: ".env.local" });

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing ${name}. Copy .env.local.example to .env.local and fill in the ` +
        `Firebase service account before running the migration.`,
    );
  }
  return v;
}

function initAdmin() {
  const privateKey = requireEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(
    /\\n/g,
    "\n",
  );
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: requireEnv("FIREBASE_ADMIN_PROJECT_ID"),
        clientEmail: requireEnv("FIREBASE_ADMIN_CLIENT_EMAIL"),
        privateKey,
      }),
    });
  const db = getFirestore(app);
  // Optional fields on Project/CareerEntry/Achievement are `undefined` when unset;
  // Firestore rejects undefined unless we tell it to ignore them.
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

// --- The seven content documents, mirroring the live site exactly -------------

const navbar: NavbarContent = {
  wordmark: { logo: "/arif-logo.png", alt: "Arif Hasan", homeAriaLabel: "Home" },
  links: [
    { label: "Career", href: "/about#career", side: "left" },
    { label: "About", href: "/about", side: "left" },
    { label: "Projects", href: "/projects", side: "right" },
    { label: "Achievements", href: "/achievements", side: "right" },
  ],
};

const hero: HeroContent = {
  eyebrow: "/ Full-Stack Developer",
  name: "Arif Hasan",
  tagline: { primary: "Building quietly", secondary: "from Sylhet, BD" },
  ctaLabel: "Get in touch",
  portraitImage: "/hero-portrait-cutout.png",
  hud: {
    statusWords: ["BUILDING", "LEARNING", "SHIPPING"],
    codingSinceYear: "2024",
    locationLabel: "Sylhet / GMT+6",
    timeZone: "Asia/Dhaka",
  },
};

const about: AboutContent = {
  descriptionHeading: [
    { segments: [{ text: "A full-stack dev" }] },
    {
      segments: [
        { text: "fueled by " },
        { text: "code", accent: true },
        { text: " & " },
        { text: "craft", accent: true },
      ],
    },
  ],
  bio:
    "Full-stack developer based in Sylhet, Bangladesh, with a BSc in Computer " +
    "Science & Engineering. I build mobile-first products with Flutter and Dart, " +
    "backed by Node.js, Firebase, and MongoDB — always building, always learning, " +
    "always shipping.",
  skillsEyebrow: "— Skills",
  skills: SKILLS,
  heroStatus: {
    location: "Sylhet, BD · GMT+6",
    availability: "Open to work",
    timeZone: "Asia/Dhaka",
    scrollCue: "Scroll",
  },
};

const career: CareerContent = {
  eyebrow: "— Career",
  items: CAREER,
};

const projects: ProjectsContent = {
  items: PROJECTS,
  caseStudy: {
    overviewLabel: "Project Overview",
    metaLabels: { role: "Role", year: "Year", stack: "Stack", note: "Note" },
    viewRepository: "View Repository",
    launchWebsite: "Launch Website",
    githubLabel: "GitHub",
    scrollCue: "Scroll",
    heroPlaceholder: "Hero image — coming soon",
    galleryPlaceholder: "Gallery — coming soon",
    nextProjectLabel: "Next project",
  },
};

const achievements: AchievementsContent = {
  eyebrow: "/ Achievements",
  heading: "Achievements",
  subtitle: "— Certificates & credentials",
  categoryOrder: CATEGORIES,
  items: ACHIEVEMENTS,
};

const footer: FooterContent = {
  eyebrow: "— Get in touch",
  note: "Now accepting inquiries",
  email: CONTACT_EMAIL,
  tags: CONTACT_TAGS,
  copyLabel: "Copy email",
  copiedLabel: "Copied ✓",
  socialLinks: SOCIALS,
  signoff: ["Arif Hasan", "Full-Stack Dev"],
};

const DOCUMENTS: Record<string, object> = {
  navbar,
  hero,
  about,
  career,
  projects,
  achievements,
  footer,
};

async function main() {
  const db = initAdmin();
  console.log("Seeding Firestore content/* …\n");
  for (const [id, data] of Object.entries(DOCUMENTS)) {
    await db.collection("content").doc(id).set(data);
    console.log(`  ✓ content/${id}`);
  }
  console.log(
    `\nDone — seeded ${Object.keys(DOCUMENTS).length} documents. The public ` +
      `pages will now render from Firestore.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nMigration failed:\n", err);
    process.exit(1);
  });
