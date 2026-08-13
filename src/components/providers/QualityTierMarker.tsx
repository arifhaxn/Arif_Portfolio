"use client";

// -----------------------------------------------------------------------------
// QualityTierMarker
// -----------------------------------------------------------------------------
// Detects the device's render-quality tier once (see lib/quality) and stamps it
// on the document root as `data-quality-tier="high|mid|low"`. That single
// attribute lets pure-CSS ambient animations (the project-card circuit traces,
// thumbnail float/glow) scale themselves down on weak hardware — the same tier
// the WebGL HeroHead already uses, so 3D and CSS stay in lockstep. Renders
// nothing. SSR leaves the attribute unset (tier unknown until the client probe),
// so the default full-fidelity CSS applies until this resolves a tick later.
// -----------------------------------------------------------------------------

import { useEffect } from "react";
import { detectQualityTier } from "@/lib/quality";

export function QualityTierMarker() {
  useEffect(() => {
    document.documentElement.dataset.qualityTier = detectQualityTier();
  }, []);
  return null;
}
