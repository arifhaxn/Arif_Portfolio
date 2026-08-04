"use client";

// -----------------------------------------------------------------------------
// ProjectCaseStudy — case-study page body
// -----------------------------------------------------------------------------
// Order on /projects/[slug]:
//   1. Entry title — the project name, huge and centered, CONSTANT (no shrink),
//      with an accent-themed animated scroll indicator. Revealed by the route's
//      pixel transition; you scroll past it.
//   2. Hero window — a fixed-size image window pinned at viewport center while a
//      grid of cells sweeps a clear band with scroll (pixelScrubReveal). Desktop
//      only; mobile + reduced-motion show it clear + static.
//   3. Overview — eyebrow + big title (left) and a metadata column (role / year /
//      stack / note + link) on the right, per the reference.
//   4. Gallery — stacked screenshots, each zooming in as it enters (galleryZoomIn).
//
// Projects without heroImage/gallery get a clearly-flagged placeholder.
//
// Scroll fix: the pin adds a pin-spacer AFTER Lenis measured the page, so its
// scroll limit goes stale and locks scrolling before the gallery. We recompute
// Lenis + ScrollTrigger once the pin is set up.
// -----------------------------------------------------------------------------

import Image from "next/image";
import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import {
  galleryZoomIn,
  pixelScrubReveal,
  prefersReducedMotion,
  scrollReveal,
} from "@/lib/animations";
import { PIXEL_SCRUB } from "@/lib/motion";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import type { Project } from "@/lib/projects";

const COLS = PIXEL_SCRUB.cols;
const WINDOW_ASPECT = 5 / 2; // hero window width:height (matches aspect-[5/2] below)
const ROWS = Math.max(2, Math.round(COLS / WINDOW_ASPECT));
const CELL_COUNT = COLS * ROWS;

export function ProjectCaseStudy({ project }: { project: Project }) {
  const root = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const lenis = useSmoothScroll();

  const hasHero = Boolean(project.heroImage);
  const hasGallery = Boolean(project.gallery?.length);
  const accent = project.accent ?? "#3b82f6";

  const rows = [
    project.role && { label: "Role", value: project.role },
    project.year && { label: "Year", value: project.year },
    project.stack?.length && { label: "Stack", value: project.stack.join("   ·   ") },
    { label: "Note", value: project.description },
  ].filter(Boolean) as { label: string; value: string }[];

  useGSAP(
    () => {
      // Always start at the top. Critical for chained-in navigations (Phase 3):
      // without it the new page inherits the previous page's bottom scroll, and
      // the next-project ring would immediately read "complete" and re-fire.
      window.scrollTo(0, 0);
      lenis?.scrollTo(0, { immediate: true });

      const mm = gsap.matchMedia();

      // Desktop: pin + scroll-scrub the pixelated hero window.
      mm.add("(min-width: 1024px)", () => {
        if (!hasHero || !windowRef.current || !gridRef.current) return;
        const cells = gsap.utils.toArray<HTMLElement>("[data-pxcell]", gridRef.current);
        const st = pixelScrubReveal({
          windowEl: windowRef.current,
          cells,
          cols: COLS,
          rows: ROWS,
        });
        return () => st?.kill();
      });

      // Mobile: drop the pin/scrub — the hero renders clear + static.
      mm.add("(max-width: 1023px)", () => {
        if (gridRef.current)
          gsap.set(gridRef.current.querySelectorAll("[data-pxcell]"), { opacity: 0 });
      });

      // Entry title reveal on mount (also the chained-in reveal from Phase 3).
      if (!prefersReducedMotion())
        gsap.from("[data-entry-title]", {
          opacity: 0,
          scale: 1.06,
          duration: 1,
          ease: "power3.out",
          clearProps: "transform",
        });

      // Overview reveal (scrolls into view after the banner) + gallery zoom.
      scrollReveal("[data-overview]", { y: 24 }, "top 85%");
      gsap.utils
        .toArray<HTMLElement>("[data-gallery]", root.current)
        .forEach((fig) => galleryZoomIn(fig));

      // The pin-spacer grew the page after Lenis measured it → recompute both, or
      // scrolling locks before the gallery.
      const t = gsap.delayedCall(0.25, () => {
        ScrollTrigger.refresh();
        lenis?.resize();
      });
      return () => t.kill();
    },
    { scope: root, dependencies: [lenis] },
  );

  return (
    <div ref={root}>
      {/* ── 1 · Entry title (constant, centered) + scroll cue ────────────── */}
      <section className="relative flex min-h-screen items-center justify-center px-6 text-center sm:px-10">
        <h1
          data-entry-title
          className="font-[family-name:var(--font-anton)] text-[clamp(2.75rem,12vw,10rem)] leading-[0.9] tracking-tight text-[#ece7df]"
        >
          {project.name}
        </h1>
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
          <ScrollCue accent={accent} />
        </div>
      </section>

      {/* ── 2 · Hero window (pinned, scroll-scrubbed pixelation) ──────────── */}
      <section className="px-6 py-16 sm:px-10 lg:py-24">
        {hasHero ? (
          <div
            ref={windowRef}
            className="relative mx-auto aspect-[5/2] w-full max-w-4xl overflow-hidden rounded-xl"
          >
            <Image
              src={project.heroImage as string}
              alt={`${project.name} hero`}
              fill
              priority
              sizes="(min-width: 1024px) 56rem, 100vw"
              className="object-cover"
            />
            {/* Pixel cover grid — swept clear by scroll (desktop) / hidden (mobile). */}
            <div
              ref={gridRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 grid"
              style={{
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                gridTemplateRows: `repeat(${ROWS}, 1fr)`,
              }}
            >
              {Array.from({ length: CELL_COUNT }).map((_, i) => (
                <div key={i} data-pxcell className="bg-black will-change-transform" />
              ))}
            </div>
          </div>
        ) : (
          <PlaceholderWindow label="Hero image — coming soon" />
        )}
      </section>

      {/* ── 3 · Overview (title + metadata) ──────────────────────────────── */}
      <section className="px-6 py-24 sm:px-10">
        <div
          data-overview
          className="mx-auto grid w-full max-w-6xl items-center gap-x-16 gap-y-14 lg:grid-cols-2"
        >
          {/* LEFT — eyebrow + big title */}
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">
              Project Overview
            </p>
            <h2 className="mt-6 font-[family-name:var(--font-anton)] text-6xl leading-[0.92] tracking-tight text-[#ece7df] sm:text-7xl lg:text-8xl">
              {project.name}
            </h2>
          </div>

          {/* RIGHT — metadata rows + link */}
          <div className="flex flex-col">
            <dl className="flex flex-col">
              {rows.map((r) => (
                <div
                  key={r.label}
                  className="grid grid-cols-[6.5rem_1fr] items-start gap-x-6 border-t border-white/10 py-5"
                >
                  <dt
                    className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em]"
                    style={{ color: accent }}
                  >
                    <span className="text-[7px] leading-none">●</span>
                    {r.label}
                  </dt>
                  <dd className="text-sm leading-relaxed text-white/85">{r.value}</dd>
                </div>
              ))}
            </dl>
            <a
              href={project.liveUrl ?? project.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex w-fit items-center gap-2 border-t border-white/10 pt-6 font-mono text-xs uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:text-white"
            >
              {project.liveUrl ? "Launch Website" : "View Repository"}
              <span aria-hidden>↗</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── 4 · Gallery (zoom-in per image, near-full-width) ─────────────── */}
      <section className="px-4 pb-40 pt-4 sm:px-6">
        {hasGallery ? (
          <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-24">
            {project.gallery?.map((g, i) => (
              <figure key={g.src} data-gallery className="flex flex-col gap-3">
                <div
                  data-gallery-img
                  className="relative aspect-[16/7] w-full overflow-hidden rounded-xl ring-1 ring-white/10"
                >
                  <Image
                    src={g.src}
                    alt={g.caption}
                    fill
                    sizes="100vw"
                    className="object-cover"
                  />
                </div>
                <figcaption
                  data-gallery-cap
                  className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500"
                >
                  {String(i + 1).padStart(2, "0")} — {g.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            <PlaceholderWindow label="Gallery — coming soon" />
          </div>
        )}
      </section>
    </div>
  );
}

/** Accent-themed animated scroll-down indicator (a segment sliding down a track). */
function ScrollCue({ accent }: { accent: string }) {
  return (
    <div
      className="pointer-events-none flex flex-col items-center gap-3"
      style={{ color: accent }}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
        Scroll
      </span>
      <span className="relative block h-12 w-px overflow-hidden">
        <span className="absolute inset-0 bg-current opacity-20" />
        <span className="scroll-cue-line absolute left-0 top-0 h-1/2 w-full bg-current" />
      </span>
    </div>
  );
}

/** Clearly-flagged stand-in for projects that don't have media yet. */
function PlaceholderWindow({ label }: { label: string }) {
  return (
    <div className="mx-auto flex aspect-[5/2] w-full max-w-4xl items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02]">
      <span className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-600">
        {label}
      </span>
    </div>
  );
}
