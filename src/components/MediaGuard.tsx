"use client";

// -----------------------------------------------------------------------------
// MediaGuard — no drag ghosts, no image context menu, on the public site
// -----------------------------------------------------------------------------
// Images and canvases are page furniture here, not assets to be lifted out of
// the layout, so two browser defaults are switched off for them:
//
//   • dragstart — <img> is natively draggable, so pressing a certificate and
//     moving produced the browser's translucent drag ghost. On the achievements
//     board that also FOUGHT the pan: the native drag captured the pointer, so a
//     drag begun on a card dragged the picture instead of panning the board.
//   • contextmenu — right-clicking an image or the robot's WebGL canvas offered
//     "Copy image" / "Save image as…".
//
// Scoped to img/canvas rather than the whole document on purpose: right-click
// still works everywhere else, so back/reload/open-in-new-tab are untouched.
// Mounted from the (site) layout, so /admin keeps both defaults — its image
// previews stay right-clickable while you're editing content.
//
// Worth being clear-eyed about what this is: friction, not protection. The
// images are still plain URLs — devtools, the network panel, or a direct request
// all still fetch them. This stops the casual grab and the accidental drag; it
// does not secure anything, and nothing rendered in a browser can.
//
// Pairs with the CSS in globals.css: `-webkit-user-drag: none` blocks the drag in
// WebKit/Blink before it starts, and the listener here covers Firefox, which has
// no CSS equivalent and only honours the event.
// -----------------------------------------------------------------------------

import { useEffect } from "react";

/** True for the elements whose browser defaults we're suppressing. */
const isProtectedMedia = (target: EventTarget | null) =>
  target instanceof Element &&
  (target.tagName === "IMG" || target.tagName === "CANVAS");

export function MediaGuard() {
  useEffect(() => {
    const block = (e: Event) => {
      if (isProtectedMedia(e.target)) e.preventDefault();
    };
    // Capture phase so this lands before any component-level handler can stop
    // the event from reaching the document.
    document.addEventListener("dragstart", block, { capture: true });
    document.addEventListener("contextmenu", block, { capture: true });
    return () => {
      document.removeEventListener("dragstart", block, { capture: true });
      document.removeEventListener("contextmenu", block, { capture: true });
    };
  }, []);

  return null;
}
