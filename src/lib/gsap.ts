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
import { Observer } from "gsap/Observer";
import { Flip } from "gsap/Flip";
import { useGSAP } from "@gsap/react";
import { guardGsapContextCycles } from "@/lib/gsapContextGuard";

// Register plugins only on the client. In the App Router this file can be pulled
// into the server graph, so we must not touch browser-only plugin internals there.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, Observer, Flip, useGSAP);

  // Project-wide defaults so individual tweens can stay terse. These mirror the
  // "house style" of the motion spec (fast, eased, no accidental overshoot).
  gsap.defaults({
    ease: "power3.out",
    duration: 0.6,
  });

  // ScrollTrigger reads CSS media queries once; keep it fresh on resize/orient.
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Leaving /about could take the whole tab down with a stack overflow inside
  // GSAP's Context.getTweens (see lib/gsapContextGuard for the full trace). This
  // makes that traversal unable to loop. It's a safety net over a root cause we
  // haven't pinned down yet, so it also SHOUTS when it catches one — that log is
  // the evidence needed to fix the graph itself rather than just survive it.
  guardGsapContextCycles(gsap, ({ skipped, rootDataLength }) => {
    console.error(
      `[gsap-context-cycle] Skipped ${skipped} repeat context visit(s) while ` +
        `tearing down a context holding ${rootDataLength} entries. Without the ` +
        `guard in lib/gsapContextGuard this would have overflowed the stack and ` +
        `killed the page. Route: ${window.location.pathname}`,
    );
  });
}

export { gsap, ScrollTrigger, Observer, Flip, useGSAP };
