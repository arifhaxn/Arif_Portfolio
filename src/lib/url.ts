// -----------------------------------------------------------------------------
// externalHref — make an admin-entered link safe to open externally
// -----------------------------------------------------------------------------
// Admins often type a bare domain ("leadunity.vercel.app") without a scheme. In
// an <a href>, that's treated as a path RELATIVE to the current page, so it opens
// the wrong place inside the site. This prepends "https://" when there's no
// scheme, leaving already-absolute URLs, mailto:/tel:, protocol-relative (//),
// hash (#), and root-relative (/) links untouched. Empty → "#".
// -----------------------------------------------------------------------------

export function externalHref(url?: string): string {
  const v = (url ?? "").trim();
  if (!v) return "#";
  // Already has a scheme (http:, https:, mailto:, tel:…), is protocol-relative,
  // a hash, or a root-relative path → leave it as-is.
  if (/^([a-z][a-z0-9+.-]*:|\/\/|[#/])/i.test(v)) return v;
  return `https://${v}`;
}
