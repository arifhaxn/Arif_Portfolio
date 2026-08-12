import "server-only";

// -----------------------------------------------------------------------------
// content — server-side reads of the Firestore `content/*` documents
// -----------------------------------------------------------------------------
// Every public page reads its copy/data through these getters, in Server
// Components, via firebase-admin. Each getter is wrapped in `unstable_cache` and
// tagged `content:<doc>` with no time-based revalidation, so:
//   • the reads happen at build/first-render and the pages prerender statically
//     (no need to force dynamic rendering everywhere), and
//   • Phase 3's admin writes can call `revalidateTag('content:<doc>')` to push an
//     edit live instantly, invalidating exactly the one document that changed.
//
// (Next 16 also offers the newer `use cache` directive; we intentionally use the
// `unstable_cache` + `revalidateTag` model here — it matches this task's tagging
// design and avoids enabling Cache Components, which would change rendering
// behavior across the whole app. `unstable_cache` remains supported in Next 16.)
// -----------------------------------------------------------------------------

import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import type {
  NavbarContent,
  HeroContent,
  AboutContent,
  CareerContent,
  ProjectsContent,
  AchievementsContent,
  FooterContent,
} from "@/lib/content-types";

/** Tag applied to a document's cache entry (also its cache key). */
export const contentTag = (doc: string) => `content:${doc}`;

/** Read one `content/<id>` document, or throw a clear error if it's missing. */
async function readContentDoc<T>(id: string): Promise<T> {
  const snap = await adminDb().collection("content").doc(id).get();
  if (!snap.exists) {
    throw new Error(
      `Firestore document content/${id} is missing. Run the one-time migration ` +
        `(npx tsx --env-file=.env.local scripts/migrate-to-firestore.ts) to seed it.`,
    );
  }
  return snap.data() as T;
}

/** Build a cached, tagged getter for a single content document. */
function contentGetter<T>(id: string): () => Promise<T> {
  return unstable_cache(() => readContentDoc<T>(id), [contentTag(id)], {
    tags: [contentTag(id)],
    revalidate: false, // cache until an admin write calls revalidateTag(...)
  });
}

export const getNavbar = contentGetter<NavbarContent>("navbar");
export const getHero = contentGetter<HeroContent>("hero");
export const getAbout = contentGetter<AboutContent>("about");
export const getCareer = contentGetter<CareerContent>("career");
export const getProjects = contentGetter<ProjectsContent>("projects");
export const getAchievements = contentGetter<AchievementsContent>("achievements");
export const getFooter = contentGetter<FooterContent>("footer");
