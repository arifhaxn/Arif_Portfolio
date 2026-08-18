"use client";

// -----------------------------------------------------------------------------
// CrashDiag — TEMPORARY. Remove once the /about → Back crash is understood.
// -----------------------------------------------------------------------------
// Going /about → browser Back kills the page ("This page couldn't load"). When
// the renderer dies it takes the console, the network panel and the heap with
// it, so there is nothing left to read afterwards. This writes to localStorage,
// which OUTLIVES a renderer crash.
//
// Two things the first attempt got wrong, both of which destroyed the very
// evidence it existed to capture:
//
//   1. The heartbeat shared one ring buffer with the real events. After the
//      crash you reload, the page sits there beating twice a second, and within
//      ~75s every meaningful entry has been evicted by its own heartbeat — the
//      first capture came back as 150 beats and nothing else. So beats are no
//      longer entries at all: only the LAST one is kept, which is all that
//      "when was the page last alive" actually needs.
//   2. The reloaded session wrote into the same key as the crashed one. The
//      crashed session is the only one that matters, so on startup the previous
//      session is moved aside to `__diag_prev` and then left strictly alone.
//
// `__diag()` prints the CRASHED session first, for that reason.
//
// Reading it: compare `lastBeat.t` against the final event's `t`. If the events
// stop at POPSTATE and lastBeat is right there with them, the process was killed
// outright — which rules out every JS-level explanation at once. If `gl-create`
// outnumbers `gl-LOST`, it's context exhaustion. If an ERROR landed, we get the
// stack. Those three are indistinguishable from outside the page.
// -----------------------------------------------------------------------------

import { useEffect } from "react";

const KEY = "__diag";
const PREV = "__diag_prev";
const MAX_EVENTS = 60; // real events only — beats are not entries (room for long stacks)

type Entry = { t: number; e: string; d?: Record<string, unknown> };
type Store = { events: Entry[]; lastBeat: Entry | null };

export function CrashDiag() {
  useEffect(() => {
    // Preserve the session that just died before recording over it.
    try {
      const prior = localStorage.getItem(KEY);
      if (prior && prior !== "null") localStorage.setItem(PREV, prior);
    } catch {
      /* private mode — nothing useful to do */
    }

    // Chrome keeps only the innermost 10 frames by default, which is why the
    // captured stacks stopped short of the actual recursion. Ask for far more.
    const prevStackLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = 200;

    const store: Store = { events: [], lastBeat: null };
    const t0 = performance.now();
    let live = 0;

    const stamp = (e: string, d?: Record<string, unknown>): Entry => {
      const mem = (performance as { memory?: { usedJSHeapSize: number } }).memory;
      return {
        t: Math.round(performance.now() - t0),
        e,
        d: {
          ...(d || {}),
          path: location.pathname,
          live,
          ...(mem ? { heapMB: Math.round(mem.usedJSHeapSize / 1048576) } : {}),
        },
      };
    };
    const flush = () => {
      try {
        localStorage.setItem(KEY, JSON.stringify(store));
      } catch {
        /* quota */
      }
    };
    // Real events are never evicted by beats now.
    const rec = (e: string, d?: Record<string, unknown>) => {
      store.events.push(stamp(e, d));
      if (store.events.length > MAX_EVENTS) store.events.shift();
      flush(); // synchronous — the LAST entry is the one that matters
    };

    rec("session-start", {
      build: process.env.NEXT_PUBLIC_BUILD_SHA || "unknown",
      ua: navigator.userAgent.slice(0, 60),
    });

    // --- WebGL contexts -------------------------------------------------------
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = (origGetContext as any).call(this, type, ...rest);
      if (/webgl/i.test(type) && ctx) {
        live++;
        rec("gl-create", { type });
        this.addEventListener("webglcontextlost", () => {
          live--;
          rec("gl-LOST");
        });
        this.addEventListener("webglcontextrestored", () => rec("gl-restored"));
      }
      return ctx;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    // --- Routing + failures ---------------------------------------------------
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (...a: Parameters<typeof origPush>) {
      rec("pushState", { to: String(a[2] ?? "") });
      return origPush.apply(this, a);
    };
    history.replaceState = function (...a: Parameters<typeof origReplace>) {
      rec("replaceState", { to: String(a[2] ?? "") });
      return origReplace.apply(this, a);
    };
    const onPop = () => rec("POPSTATE (Back)");
    const onErr = (ev: ErrorEvent) =>
      rec("ERROR", {
        msg: ev.message,
        stack: String(ev.error?.stack || "").slice(0, 6000),
      });
    const onRej = (ev: PromiseRejectionEvent) =>
      rec("REJECTION", { reason: String(ev.reason).slice(0, 400) });
    const onHide = () => rec("pagehide");
    const onVis = () => rec("visibility:" + document.visibilityState);

    window.addEventListener("popstate", onPop);
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVis);

    // Heartbeat: only ever the most recent one is kept, so it cannot drown the
    // events the way the first version did.
    const beat = setInterval(() => {
      store.lastBeat = stamp("beat");
      flush();
    }, 500);

    Object.assign(window as object, {
      __diag: () => {
        const prev = localStorage.getItem(PREV);
        const cur = localStorage.getItem(KEY);
        console.log(
          "=== CRASHED SESSION (the one that matters) ===\n" + (prev ?? "(none)"),
        );
        console.log("=== CURRENT SESSION ===\n" + (cur ?? "(none)"));
        return { prev: JSON.parse(prev || "null"), current: JSON.parse(cur || "null") };
      },
      __diagClear: () => {
        localStorage.removeItem(KEY);
        localStorage.removeItem(PREV);
      },
    });

    return () => {
      Error.stackTraceLimit = prevStackLimit;
      clearInterval(beat);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVis);
      HTMLCanvasElement.prototype.getContext = origGetContext;
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  return null;
}
