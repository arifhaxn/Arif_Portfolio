// -----------------------------------------------------------------------------
// Pixel-reveal suppression flag
// -----------------------------------------------------------------------------
// The <PixelReveal> cover normally plays on every route change. When the
// next-project chain (NextProjectChain) navigates via its own ring-fill + title
// reveal, we don't want a second transition layered on top — so it raises this
// one-shot flag right before router.push, and PixelReveal consumes it to skip the
// cover for exactly that navigation. Module-level (not React state) so it's read
// synchronously in PixelReveal's layout effect.
// -----------------------------------------------------------------------------

let skip = false;

/** Skip the pixel-reveal cover for the very next route change. */
export function suppressNextPixelReveal() {
  skip = true;
}

/** Read-and-clear the skip flag (true = don't play the cover this time). */
export function consumePixelRevealSkip(): boolean {
  const value = skip;
  skip = false;
  return value;
}
