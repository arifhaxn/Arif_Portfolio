"use client";

// -----------------------------------------------------------------------------
// HeadScanProvider — registry of mounted HeroHead exit-scans
// -----------------------------------------------------------------------------
// Each mounted HeroHead (that isn't in reduced-motion) registers an exit-scan
// function here; the Navbar consults it to gate navigation: if any HeroHead is
// mounted, it plays every registered exit scan and only navigates once they all
// finish. Pages without a HeroHead register nothing → `hasMounted()` is false →
// navigation is immediate. Presence-based (not route-hardcoded), so it stays
// correct if HeroHead usage changes.
//
// The registry lives in a ref (not state) — it's read imperatively at click time,
// so registering/unregistering never needs to re-render consumers.
// -----------------------------------------------------------------------------

import { createContext, useContext, useRef, type ReactNode } from "react";

type ExitFn = () => Promise<void>;

export type HeadScanRegistry = {
  register: (fn: ExitFn) => void;
  unregister: (fn: ExitFn) => void;
  /** Any HeroHead currently mounted with a scan (i.e. gate navigation)? */
  hasMounted: () => boolean;
  /** Play every registered exit scan; resolves once they all complete. */
  playExitAll: () => Promise<void>;
};

const NOOP: HeadScanRegistry = {
  register: () => {},
  unregister: () => {},
  hasMounted: () => false,
  playExitAll: () => Promise.resolve(),
};

const HeadScanContext = createContext<HeadScanRegistry>(NOOP);

/** Access the registry (no-op fallback if no provider is mounted). */
export function useHeadScan(): HeadScanRegistry {
  return useContext(HeadScanContext);
}

export function HeadScanProvider({ children }: { children: ReactNode }) {
  const set = useRef<Set<ExitFn>>(new Set());
  const registry = useRef<HeadScanRegistry>({
    register: (fn) => set.current.add(fn),
    unregister: (fn) => set.current.delete(fn),
    hasMounted: () => set.current.size > 0,
    playExitAll: () =>
      Promise.all([...set.current].map((fn) => fn())).then(() => undefined),
  }).current;

  return (
    <HeadScanContext.Provider value={registry}>{children}</HeadScanContext.Provider>
  );
}
