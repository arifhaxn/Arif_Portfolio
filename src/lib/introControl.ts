// -----------------------------------------------------------------------------
// Landing intro coordination
// -----------------------------------------------------------------------------
// The landing preloader (IntroPreloader) covers the page with a centered logo,
// holds, then docks the logo into the navbar and clears the black to reveal the
// page. The hero's entrance animations must WAIT for that reveal so the scramble
// / nav-intro plays in view rather than hidden behind the cover.
//
// This tiny module coordinates the two without a provider: the preloader
// `claimIntro`s once (the first client mount on `/`) and calls `reveal()` as the
// black clears; the hero subscribes via `onReveal`. `claimIntro` returning false
// (not the first load, or not `/`) reveals immediately so nothing is left hidden.
// State is a module singleton — reset on a full page load (intro replays), kept
// across SPA navigations (no replay).
// -----------------------------------------------------------------------------

let firstMount = true;
let revealed = false;
const revealCbs = new Set<() => void>();

/**
 * Claim the one-time landing intro. Returns true only on the first client mount
 * at `/`. When it returns false there is nothing to wait for, so it reveals now.
 * Call only on the client (it consumes the one-shot flag).
 */
export function claimIntro(pathname: string): boolean {
  const play = firstMount && pathname === "/";
  firstMount = false;
  if (!play) reveal();
  return play;
}

/** Reveal the page — fire every pending `onReveal` callback (idempotent). */
export function reveal(): void {
  if (revealed) return;
  revealed = true;
  revealCbs.forEach((cb) => cb());
  revealCbs.clear();
}

/**
 * Run `cb` when the page reveals (immediately if it already has). Returns an
 * unsubscribe so a component can drop its pending callback on unmount.
 */
export function onReveal(cb: () => void): () => void {
  if (revealed) {
    cb();
    return () => {};
  }
  revealCbs.add(cb);
  return () => {
    revealCbs.delete(cb);
  };
}
