"use server";

// -----------------------------------------------------------------------------
// content-actions — the ONE write path for admin content edits
// -----------------------------------------------------------------------------
// `saveSection(docId, data)` is called by every admin form (copy sections save
// the whole doc; structured sections save the whole doc after each item change).
// It:
//   1. re-verifies the admin session server-side (a Server Action endpoint is
//      publicly reachable, so it must NOT trust the client),
//   2. validates the payload for that document's shape (required fields present),
//   3. strips `undefined` (Firestore rejects it) and writes the whole document,
//   4. revalidates that document's Phase-1 cache tag so the public site updates
//      immediately.
// Returns a typed result; forms surface `error` in the UI instead of failing
// silently.
// -----------------------------------------------------------------------------

import { revalidateTag } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { contentTag } from "@/lib/content";
import { getVerifiedAdmin } from "@/lib/admin-auth";

export type SaveResult = { ok: true } | { ok: false; error: string };

const KNOWN_DOCS = new Set([
  "hero",
  "navbar",
  "about",
  "footer",
  "career",
  "projects",
  "achievements",
]);

export async function saveSection(
  docId: string,
  data: unknown,
): Promise<SaveResult> {
  // 1. Auth — never trust that the caller is the admin.
  const admin = await getVerifiedAdmin();
  if (!admin) return { ok: false, error: "Not authenticated. Please sign in again." };

  if (!KNOWN_DOCS.has(docId)) {
    return { ok: false, error: `Unknown section "${docId}".` };
  }
  if (!data || typeof data !== "object") {
    return { ok: false, error: "Invalid data." };
  }

  // 2. Validate for this document's shape.
  const error = validate(docId, data as Record<string, unknown>);
  if (error) return { ok: false, error };

  // 3 + 4. Write the whole document, then revalidate its tag.
  try {
    await adminDb()
      .collection("content")
      .doc(docId)
      .set(stripUndefined(data));
    // Expire this document's cache entry immediately (Next 16 requires the 2nd
    // arg; `{ expire: 0 }` gives read-your-own-writes freshness — the next public
    // visit blocks and re-reads Firestore, rather than "max" stale-while-
    // revalidate where the first viewer would still see the old content).
    revalidateTag(contentTag(docId), { expire: 0 });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save. Please retry.",
    };
  }
}

// --- validation helpers ------------------------------------------------------

const str = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const arr = (v: unknown): v is unknown[] => Array.isArray(v);
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

function validate(docId: string, d: Record<string, unknown>): string | null {
  switch (docId) {
    case "hero":
      return validateHero(d);
    case "navbar":
      return validateNavbar(d);
    case "about":
      return validateAbout(d);
    case "footer":
      return validateFooter(d);
    case "career":
      return validateCareer(d);
    case "projects":
      return validateProjects(d);
    case "achievements":
      return validateAchievements(d);
    default:
      return "Unknown section.";
  }
}

function validateHero(d: Record<string, unknown>): string | null {
  for (const f of ["eyebrow", "name", "ctaLabel", "portraitImage"]) {
    if (!str(d[f])) return `Hero: "${f}" is required.`;
  }
  const t = d.tagline;
  if (!obj(t) || !str(t.primary) || !str(t.secondary))
    return "Hero: both tagline lines are required.";
  const hud = d.hud;
  if (!obj(hud)) return "Hero: HUD fields are required.";
  if (!arr(hud.statusWords) || hud.statusWords.length === 0 || !hud.statusWords.every(str))
    return "Hero: at least one HUD status word is required.";
  for (const f of ["codingSinceYear", "locationLabel", "timeZone"]) {
    if (!str(hud[f])) return `Hero: HUD "${f}" is required.`;
  }
  return null;
}

function validateNavbar(d: Record<string, unknown>): string | null {
  const w = d.wordmark;
  if (!obj(w) || !str(w.logo) || !str(w.alt) || !str(w.homeAriaLabel))
    return "Navbar: wordmark logo, alt, and home label are required.";
  if (!arr(d.links) || d.links.length === 0) return "Navbar: at least one link is required.";
  for (const l of d.links) {
    if (!obj(l) || !str(l.label) || !str(l.href)) return "Navbar: every link needs a label and href.";
    if (l.side !== "left" && l.side !== "right") return "Navbar: every link needs a side (left/right).";
  }
  return null;
}

function validateAbout(d: Record<string, unknown>): string | null {
  if (!arr(d.descriptionHeading) || d.descriptionHeading.length === 0)
    return "About: the description heading needs at least one line.";
  for (const line of d.descriptionHeading) {
    if (!obj(line) || !arr(line.segments) || line.segments.length === 0)
      return "About: each heading line needs at least one segment.";
    for (const seg of line.segments) {
      if (!obj(seg) || !str(seg.text)) return "About: every heading segment needs text.";
    }
  }
  if (!str(d.bio)) return "About: bio is required.";
  if (!str(d.skillsEyebrow)) return "About: skills eyebrow is required.";
  if (!arr(d.skills) || d.skills.length === 0) return "About: at least one skill group is required.";
  for (const g of d.skills) {
    if (!obj(g) || !str(g.label)) return "About: every skill group needs a label.";
    if (!arr(g.items) || g.items.length === 0 || !g.items.every(str))
      return "About: every skill group needs at least one skill.";
  }
  const hs = d.heroStatus;
  if (!obj(hs) || !str(hs.location) || !str(hs.availability) || !str(hs.timeZone) || !str(hs.scrollCue))
    return "About: hero-status location, availability, timezone, and scroll cue are required.";
  return null;
}

function validateFooter(d: Record<string, unknown>): string | null {
  for (const f of ["eyebrow", "note", "email", "copyLabel", "copiedLabel"]) {
    if (!str(d[f])) return `Footer: "${f}" is required.`;
  }
  if (!arr(d.tags) || !d.tags.every(str)) return "Footer: tags must all be non-empty.";
  if (!arr(d.socialLinks)) return "Footer: social links are required.";
  for (const s of d.socialLinks) {
    if (!obj(s) || !str(s.label) || !str(s.href) || !str(s.icon))
      return "Footer: every social link needs a label, href, and icon.";
  }
  if (!arr(d.signoff) || d.signoff.length === 0 || !d.signoff.every(str))
    return "Footer: at least one sign-off line is required.";
  return null;
}

function validateCareer(d: Record<string, unknown>): string | null {
  if (!str(d.eyebrow)) return "Career: eyebrow is required.";
  if (!arr(d.items)) return "Career: items must be a list.";
  for (const it of d.items) {
    if (!obj(it)) return "Career: invalid entry.";
    for (const f of ["company", "period"]) {
      if (!str(it[f])) return `Career: every entry needs a "${f}".`;
    }
    // Title (blue) + description (grey) form the detail line; at least one is
    // required, but either may be empty.
    if (!str(it.title) && !str(it.description))
      return "Career: every entry needs a title and/or description.";
    if (it.side !== "left" && it.side !== "right") return "Career: every entry needs a side (left/right).";
  }
  return null;
}

function validateProjects(d: Record<string, unknown>): string | null {
  if (!obj(d.caseStudy)) return "Projects: case-study copy is missing (do not remove it).";
  if (!arr(d.items)) return "Projects: items must be a list.";
  for (const it of d.items) {
    if (!obj(it)) return "Projects: invalid project.";
    for (const f of ["num", "slug", "name", "description", "repo"]) {
      if (!str(it[f])) return `Projects: every project needs a "${f}".`;
    }
    if (!arr(it.stack) || it.stack.length === 0 || !it.stack.every(str))
      return "Projects: every project needs at least one stack item.";
    if (it.gallery !== undefined) {
      if (!arr(it.gallery)) return "Projects: gallery must be a list.";
      for (const g of it.gallery) {
        if (!obj(g) || !str(g.src) || !str(g.caption))
          return "Projects: every gallery image needs a source and caption.";
      }
    }
  }
  return null;
}

function validateAchievements(d: Record<string, unknown>): string | null {
  for (const f of ["eyebrow", "heading", "subtitle"]) {
    if (!str(d[f])) return `Achievements: "${f}" is required.`;
  }
  if (!arr(d.categoryOrder) || d.categoryOrder.length === 0 || !d.categoryOrder.every(str))
    return "Achievements: category order is required.";
  const categories = new Set(d.categoryOrder as string[]);
  if (!arr(d.items)) return "Achievements: items must be a list.";
  for (const it of d.items) {
    if (!obj(it)) return "Achievements: invalid entry.";
    for (const f of ["id", "title", "issuer", "category"]) {
      if (!str(it[f])) return `Achievements: every entry needs a "${f}".`;
    }
    if (!categories.has(it.category as string))
      return `Achievements: "${it.category}" is not one of the known categories.`;
  }
  return null;
}

// --- write helper ------------------------------------------------------------

/** Deep-remove `undefined` properties (Firestore rejects them). */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}
