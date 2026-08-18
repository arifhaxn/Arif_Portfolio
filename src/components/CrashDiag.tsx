"use client";

// -----------------------------------------------------------------------------
// CrashDiag — TEMPORARY. Remove once the /about → Back crash is understood.
// -----------------------------------------------------------------------------
// Going /about → browser Back kills the page ("This page couldn't load"). Every
// attempt to diagnose it has failed for the same reason: when the renderer dies
// it takes the console, the network panel and the JS heap with it, so there is
// nothing left to read afterwards. Guessing from the outside has now been wrong
// three times.
//
// So this writes a running log to localStorage — the one place that OUTLIVES a
// renderer crash. Reproduce the crash, reload, and the last entries before the
// tab died are still there, in order, with timestamps.
//
// It records only what's needed to tell the candidate failures apart:
//   • route changes (pushState / replaceState / popstate) — so we can see how
//     far the Back navigation got before it died,
//   • WebGL context create / lost / restored, with a running LIVE count — a GPU
//     context exhaustion looks completely different here from a JS error,
//   • uncaught errors and promise rejections, with stack,
//   • JS heap size at each step, for an out-of-memory pattern,
//   • a 500ms heartbeat — if the log simply STOPS mid-navigation with no error,
//     that itself is the finding: the process was killed rather than throwing.
//
// Deliberately tiny and synchronous: a batched or async writer would lose the
// final entries, which are the only ones that matter.
// -----------------------------------------------------------------------------

import { useEffect } from "react";

const KEY = "__diag";
const MAX = 150; // ring buffer — keep the tail, that's where the crash is

export function CrashDiag() {
  useEffect(() => {
    type Entry = { t: number; e: string; d?: unknown };
    let log: Entry[] = [];
    try {
      log = JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      log = [];
    }

    const t0 = performance.now();
    let live = 0;

    const flush = () => {
      try {
        localStorage.setItem(KEY, JSON.stringify(log.slice(-MAX)));
      } catch {
        /* quota / private mode — nothing useful to do */
      }
    };
    const rec = (e: string, d?: unknown) => {
      const mem = (performance as { memory?: { usedJSHeapSize: number } }).memory;
      log.push({
        t: Math.round(performance.now() - t0),
        e,
        d: {
          ...(typeof d === "object" && d !== null ? d : d !== undefined ? { v: d } : {}),
          path: location.pathname,
          live,
          ...(mem ? { heapMB: Math.round(mem.usedJSHeapSize / 1048576) } : {}),
        },
      });
      flush(); // synchronous: the LAST entry is the one that matters
    };

    rec("session-start", { ua: navigator.userAgent.slice(0, 90) });

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

    // --- Routing --------------------------------------------------------------
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
      rec("ERROR", { msg: ev.message, stack: String(ev.error?.stack || "").slice(0, 600) });
    const onRej = (ev: PromiseRejectionEvent) =>
      rec("REJECTION", { reason: String(ev.reason).slice(0, 400) });
    const onHide = () => rec("pagehide");
    const onVis = () => rec("visibility:" + document.visibilityState);

    window.addEventListener("popstate", onPop);
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVis);

    // Heartbeat — a log that stops dead mid-navigation means the process was
    // killed outright rather than throwing anything catchable.
    const beat = setInterval(() => rec("beat"), 500);

    // Console helpers for reading it back after the crash.
    Object.assign(window as object, {
      __diag: () => {
        console.log(localStorage.getItem(KEY));
        return JSON.parse(localStorage.getItem(KEY) || "[]");
      },
      __diagClear: () => localStorage.removeItem(KEY),
    });

    return () => {
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
