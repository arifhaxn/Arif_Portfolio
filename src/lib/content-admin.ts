import "server-only";

// -----------------------------------------------------------------------------
// content-admin — FRESH (uncached) content reads for the admin edit forms
// -----------------------------------------------------------------------------
// The public getters in lib/content.ts are `unstable_cache`-wrapped, so they can
// serve a stale snapshot until a tag is revalidated. The admin forms must always
// load the CURRENT document, so they read Firestore directly here (no cache).
// -----------------------------------------------------------------------------

import { adminDb } from "@/lib/firebase-admin";

/** Read one `content/<id>` document straight from Firestore (no caching). */
export async function getSectionForAdmin<T = Record<string, unknown>>(
  id: string,
): Promise<T> {
  const snap = await adminDb().collection("content").doc(id).get();
  if (!snap.exists) {
    throw new Error(
      `Firestore document content/${id} is missing. Run the Phase 1 migration first.`,
    );
  }
  return snap.data() as T;
}
