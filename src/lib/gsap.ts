// -----------------------------------------------------------------------------
// Central GSAP + plugin registration
// -----------------------------------------------------------------------------
// Every module that needs GSAP should import from HERE rather than importing
// "gsap" directly. That guarantees:
//   1. Plugins (ScrollTrigger, useGSAP) are registered exactly once, before any
//      animation runs.
//   2. Registration only happens in the browser. GSAP's DOM plugins throw / warn
//      if you register them during server rendering, so we guard on `window`.
//   3. There is a single source of truth for GSAP configuration and defaults.
// -----------------------------------------------------------------------------

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// Register plugins only on the client. In the App Router this file can be pulled
// into the server graph, so we must not touch browser-only plugin internals there.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);

  // Project-wide defaults so individual tweens can stay terse. These mirror the
  // "house style" of the motion spec (fast, eased, no accidental overshoot).
  gsap.defaults({
    ease: "power3.out",
    duration: 0.6,
  });

  // ScrollTrigger reads CSS media queries once; keep it fresh on resize/orient.
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger, useGSAP };
