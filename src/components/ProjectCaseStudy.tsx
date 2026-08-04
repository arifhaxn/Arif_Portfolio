"use client";

// -----------------------------------------------------------------------------
// ProjectCaseStudy — case-study page body (Phase 2)
// -----------------------------------------------------------------------------
// Rendered below the persistent title header on /projects/[slug]:
//   1. Hero window — a fixed-size image window pinned at viewport center while a
//      grid of cells scrubs from covered → clear → covered with scroll
//      (pixelScrubReveal). Desktop only; mobile + reduced-motion show it static.
//   2. About info — title, role/stack, description (scrollReveal fade+rise).
//   3. Gallery — stacked screenshots, each zooming in as it enters (galleryZoomIn),
//      caption fading in once its zoom settles.
//
// Projects without heroImage/gallery (every project but LeadUnity, for now) get a
// clearly-flagged placeholder in each slot.
// -----------------------------------------------------------------------------

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { galleryZoomIn, pixelScrubReveal, scrollReveal } from "@/lib/animations";
import { PIXEL_SCRUB } from "@/lib/motion";
import type { Project } from "@/lib/projects";

const COLS = PIXEL_SCRUB.cols;
const WINDOW_ASPECT = 5 / 2; // hero window width:height (matches aspect-[5/2] below)
const ROWS = Math.max(2, Math.round(COLS / WINDOW_ASPECT));
const CELL_COUNT = COLS * ROWS;

export function ProjectCaseStudy({ project }: { project: Project }) {
  const root = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const hasHero = Boolean(project.heroImage);
  const hasGallery = Boolean(project.gallery?.length);

  useGSAP(
    () => {
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

      // About block reveal (all viewports).
      scrollReveal("[data-about]", { y: 24 }, "top 85%");

      // Gallery zoom-in (all viewports; one-shot, not scroll-scrubbed).
      gsap.utils
        .toArray<HTMLElement>("[data-gallery]", root.current)
        .forEach((fig) => galleryZoomIn(fig));
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      {/* ── 1 · Hero window (pinned, scroll-scrubbed pixelation) ───────────── */}
      {/* Top padding starts the window BELOW viewport center so scrolling down
          raises it to center (where it pins + fully clears). */}
      <section className="px-6 pb-16 pt-24 sm:px-10 lg:pb-[8vh] lg:pt-[42vh]">
        {hasHero ? (
          <div
            ref={windowRef}
            className="relative mx-auto aspect-[5/2] w-full max-w-4xl overflow-hidden rounded-xl ring-1 ring-white/10"
          >
            <Image
              src={project.heroImage as string}
              alt={`${project.name} hero`}
              fill
              priority
              sizes="(min-width: 1024px) 56rem, 100vw"
              className="object-cover"
            />
            {/* Pixel cover grid — cleared by scroll (desktop) / hidden (mobile). */}
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
                <div key={i} data-pxcell className="bg-[#0a0a0a] will-change-transform" />
              ))}
            </div>
          </div>
        ) : (
          <PlaceholderWindow label="Hero image — coming soon" />
        )}
      </section>

      {/* ── 2 · About info ────────────────────────────────────────────────── */}
      <section className="px-6 pb-8 sm:px-10">
        <div data-about className="mx-auto flex max-w-4xl flex-col gap-6">
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {project.name}
          </h2>
          <dl className="flex flex-wrap gap-x-12 gap-y-4 font-mono text-xs uppercase tracking-[0.2em]">
            <div>
              <dt className="text-zinc-600">Role</dt>
              <dd className="mt-1 text-zinc-300">Design &amp; Development</dd>
            </div>
            <div>
              <dt className="text-zinc-600">Stack</dt>
              <dd className="mt-1 text-zinc-300">{project.stack.join(" · ")}</dd>
            </div>
          </dl>
          <p className="max-w-2xl text-base leading-relaxed text-zinc-400">
            {project.description}
          </p>
        </div>
      </section>

      {/* ── 3 · Gallery (zoom-in per image) ───────────────────────────────── */}
      <section className="px-6 pb-40 pt-12 sm:px-10">
        {hasGallery ? (
          <div className="mx-auto flex max-w-4xl flex-col gap-24">
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
                    sizes="(min-width: 1024px) 56rem, 100vw"
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
