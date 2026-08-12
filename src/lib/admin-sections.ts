// -----------------------------------------------------------------------------
// Admin sections — one entry per Firestore content/* document (Phase 1)
// -----------------------------------------------------------------------------
// Drives the admin sidebar nav and the placeholder section pages. The order and
// labels match Phase 1's document grouping exactly — each page/section is listed
// separately so the admin edits content where a person would look for it.
// Phase 3 turns each of these into a real edit form for its `doc`.
// -----------------------------------------------------------------------------

export interface AdminSection {
  /** URL slug + Firestore document id (they're the same). */
  slug: string;
  /** Sidebar label. */
  label: string;
  /** Firestore document path this section edits. */
  doc: string;
}

export const ADMIN_SECTIONS: AdminSection[] = [
  { slug: "hero", label: "Hero", doc: "content/hero" },
  { slug: "navbar", label: "Navbar", doc: "content/navbar" },
  { slug: "about", label: "About", doc: "content/about" },
  { slug: "achievements", label: "Achievements", doc: "content/achievements" },
  { slug: "projects", label: "Projects", doc: "content/projects" },
  { slug: "career", label: "Career", doc: "content/career" },
  { slug: "footer", label: "Footer", doc: "content/footer" },
];

export function getAdminSection(slug: string): AdminSection | undefined {
  return ADMIN_SECTIONS.find((s) => s.slug === slug);
}
