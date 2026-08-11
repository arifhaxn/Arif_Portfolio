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
//   4. Gallery — a sticky "stacking deck": each screenshot card rises from the
//      bottom on scroll and pins with a small downward offset, so earlier cards
//      pile up behind it with just their top edge peeking. Hovering a card zooms
//      its image slightly. Pure CSS (sticky + hover) — themed to the dark site.
//
// Projects without heroImage/gallery get a clearly-flagged placeholder.
//
// Scroll fix: the pin adds a pin-spacer AFTER Lenis measured the page, so its
// scroll limit goes stale and locks scrolling before the gallery. We recompute
// Lenis + ScrollTrigger once the pin is set up.
// -----------------------------------------------------------------------------

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import {
  achievementCardTilt,
  achievementModalIn,
  achievementModalOut,
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

// GitHub mark (simple-icons) — the side action + mobile link on the gallery.
const GITHUB_ICON =
  "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12";

// Lightbox pixel-block dissolve grid — fine tiles (48 × 27 = the images' 16/9
// aspect, so each tile stays square).
const LIGHTBOX_COLS = 48;
const LIGHTBOX_ROWS = 27;
const LIGHTBOX_TILES = LIGHTBOX_COLS * LIGHTBOX_ROWS;

export function ProjectCaseStudy({ project }: { project: Project }) {
  const root = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const galleryInfoRef = useRef<HTMLDivElement>(null);
  const lenis = useSmoothScroll();

  // Which gallery shot is the front card of the stacking deck (desktop only).
  // Drives the LEFT column's changing title as the deck shifts on scroll.
  const [activeShot, setActiveShot] = useState(0);
  // Index of the shot opened in the fullscreen lightbox (null = closed).
  const [lightbox, setLightbox] = useState<number | null>(null);

  const hasHero = Boolean(project.heroImage);
  const hasGallery = Boolean(project.gallery?.length);
  const accent = project.accent ?? "#3b82f6";

  // The shot list is the deck; `shot` is the currently-active (front) one.
  const shots = project.gallery ?? [];
  const shot = shots[activeShot];
  const shotCount = String(shots.length).padStart(2, "0");

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

      // Overview reveal (scrolls into view after the banner). The gallery below
      // is a CSS sticky "stacking deck" — no GSAP tween; the rise-from-bottom is
      // the scroll itself and the zoom is a CSS hover.
      scrollReveal("[data-overview]", { y: 24 }, "top 85%");

      // Gallery (xl 3-column layout only): track which deck card is front-most so
      // the LEFT column can show that shot's title/meta and change as the deck
      // shifts. Each card's tall flow region maps to one active window; callbacks
      // only (no tween). Below xl the deck is a plain list with inline captions.
      mm.add("(min-width: 1280px)", () => {
        gsap.utils
          .toArray<HTMLElement>("[data-deck-card]", root.current)
          .forEach((card, i) => {
            ScrollTrigger.create({
              trigger: card,
              start: "top 60%",
              end: "bottom 40%",
              onToggle: (self) => self.isActive && setActiveShot(i),
            });
          });
      });

      // The hero pin adds a pin-spacer AFTER Lenis measured the page, so Lenis's
      // scroll limit goes stale and can lock scrolling before the gallery. With
      // the long stacking deck this is more pronounced, so re-measure both a few
      // times as layout/fonts settle and on the window load event — otherwise the
      // far end of the deck becomes unreachable.
      const remeasure = () => {
        ScrollTrigger.refresh();
        lenis?.resize();
      };
      const t1 = gsap.delayedCall(0.25, remeasure);
      const t2 = gsap.delayedCall(1, remeasure);
      const t3 = gsap.delayedCall(2.5, remeasure);
      window.addEventListener("load", remeasure);
      return () => {
        t1.kill();
        t2.kill();
        t3.kill();
        window.removeEventListener("load", remeasure);
      };
    },
    { scope: root, dependencies: [lenis] },
  );

  // Crossfade the LEFT column's shot title/meta whenever the active deck card
  // changes (a small fade-up). Reduced motion: swap instantly, no tween.
  useEffect(() => {
    const el = galleryInfoRef.current;
    if (!el || prefersReducedMotion()) return;
    const tween = gsap.fromTo(
      el,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },
    );
    return () => tween.kill();
  }, [activeShot]);

  return (
    <div ref={root}>
      {/* ── 1 · FROZEN entry title (fixed, centered) ─────────────────────────
          It never moves; the opaque content layer below scrolls UP and covers it
          (the pixel banner overlapping the title), so it reads as stationary
          until the overview takes over. */}
      <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center px-6 text-center sm:px-10">
        <h1
          data-entry-title
          className="font-[family-name:var(--font-anton)] text-[clamp(3.5rem,16vw,14rem)] leading-[0.9] tracking-tight text-[#ece7df]"
        >
          {project.name}
        </h1>
      </div>
      <div className="pointer-events-none fixed bottom-12 left-1/2 z-10 -translate-x-1/2">
        <ScrollCue accent={accent} />
      </div>

      {/* First screen — transparent, so the fixed title shows through it. */}
      <div className="h-screen" aria-hidden />

      {/* Content layer — opaque; scrolls up over the frozen title and covers it. */}
      <div className="relative z-20 bg-black">
      {/* ── 2 · Hero window (pinned, scroll-scrubbed pixelation) — wide, inset ── */}
      <section className="px-6 sm:px-10 lg:px-16">
        {hasHero ? (
          <div
            ref={windowRef}
            className="relative aspect-[5/2] w-full overflow-hidden rounded-xl"
          >
            <Image
              src={project.heroImage as string}
              alt={`${project.name} hero`}
              fill
              priority
              sizes="100vw"
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

      {/* ── 4 · Gallery — centered stacking deck with side info (reference) ──
          Desktop (xl+): a 3-column composition. LEFT = the ACTIVE shot's index /
          title / role / year (changes as the deck shifts) + CTA. RIGHT = a "See
          all (0N)" card. Both are sticky-centered so they stay put. CENTER = the
          image deck: each card is sticky and vertically centered (top = 50vh −
          half the image height), with a per-index downward offset so later cards
          pin slightly lower and earlier ones peek at the top as the deck rises
          from the bottom on scroll. NO per-card caption — captions used to stack
          on top of each other; the left column shows the active one instead.
          Hover zooms the card. Center track is a fixed 42rem so the vertical-
          centering math is exact; image is aspect-[16/9] → 23.625rem → 11.81rem
          half. */}
      <section className="relative px-6 pb-40 pt-8 sm:px-10">
        {hasGallery ? (
          <>
            {/* Desktop composition */}
            <div className="mx-auto hidden max-w-[110rem] xl:grid xl:grid-cols-[minmax(0,1fr)_42rem_minmax(0,1fr)] xl:gap-8">
              {/* LEFT — active shot's index + title (changes with the deck) */}
              <div className="sticky top-0 flex h-screen flex-col justify-center">
                <div ref={galleryInfoRef}>
                  <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">
                    {project.name} — {String(activeShot + 1).padStart(2, "0")} /{" "}
                    {shotCount}
                  </p>
                  <h3 className="mt-5 font-[family-name:var(--font-anton)] text-4xl leading-[1.02] tracking-tight text-[#ece7df]">
                    {shot?.caption}
                  </h3>
                </div>
              </div>

              {/* CENTER — the stacking deck. Each card is a button: hovering
                  zooms the WHOLE card, clicking opens the fullscreen lightbox. */}
              <div className="relative">
                {shots.map((g, i) => (
                  <div
                    key={g.src}
                    data-deck-card
                    className="sticky"
                    style={{
                      top: `calc(50vh - 11.81rem + ${i * 1.25}rem)`,
                      zIndex: i + 1,
                    }}
                  >
                    <figure className="pb-[22vh]">
                      <button
                        type="button"
                        onClick={() => setLightbox(i)}
                        aria-label={`Open ${g.caption}`}
                        className="relative block aspect-[16/9] w-full cursor-zoom-in overflow-hidden rounded-2xl bg-zinc-950 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/10 transition-[scale,box-shadow] duration-500 ease-out hover:ring-white/25 motion-safe:hover:scale-[1.03]"
                      >
                        <Image
                          src={g.src}
                          alt={g.caption}
                          fill
                          sizes="42rem"
                          className="object-cover"
                        />
                      </button>
                    </figure>
                  </div>
                ))}
              </div>

              {/* RIGHT — GitHub button, held at viewport center */}
              <div className="sticky top-0 flex h-screen flex-col items-end justify-center">
                <a
                  href={project.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${project.name} on GitHub`}
                  className="group inline-flex items-center gap-3 rounded-2xl bg-white/[0.04] px-5 py-4 ring-1 ring-white/10 transition-colors hover:bg-white/[0.07] hover:ring-white/25"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6 text-zinc-200 transition-colors group-hover:text-white"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d={GITHUB_ICON} />
                  </svg>
                  <span className="font-mono text-sm text-zinc-200 transition-colors group-hover:text-white">
                    GitHub <span aria-hidden>↗</span>
                  </span>
                </a>
              </div>
            </div>

            {/* Mobile / tablet — simple stacked list (no side columns) */}
            <div className="mx-auto flex max-w-2xl flex-col gap-14 xl:hidden">
              <div className="flex items-center justify-between">
                <h3 className="font-[family-name:var(--font-anton)] text-4xl leading-[0.9] tracking-tight text-[#ece7df]">
                  {project.name}
                </h3>
                <a
                  href={project.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${project.name} on GitHub`}
                  className="group inline-flex items-center gap-2 rounded-xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/10 transition-colors hover:bg-white/[0.07] hover:ring-white/25"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 text-zinc-200 transition-colors group-hover:text-white"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d={GITHUB_ICON} />
                  </svg>
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-300 transition-colors group-hover:text-white">
                    GitHub
                  </span>
                </a>
              </div>
              {project.gallery?.map((g, i) => (
                <figure key={g.src} className="flex flex-col gap-4">
                  <button
                    type="button"
                    onClick={() => setLightbox(i)}
                    aria-label={`Open ${g.caption}`}
                    className="relative block aspect-[16/9] w-full cursor-zoom-in overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-white/10 transition-transform duration-500 ease-out motion-safe:hover:scale-[1.02]"
                  >
                    <Image
                      src={g.src}
                      alt={g.caption}
                      fill
                      sizes="(min-width: 640px) 42rem, 100vw"
                      className="object-cover"
                    />
                  </button>
                  <figcaption className="grid grid-cols-3 items-start font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    <span className="text-zinc-600">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-center text-sm normal-case tracking-normal text-zinc-100">
                      {g.caption}
                    </span>
                    <span className="text-right" style={{ color: accent }}>
                      © {project.year ?? ""}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-4xl">
            <PlaceholderWindow label="Gallery — coming soon" />
          </div>
        )}
      </section>
      </div>

      {/* Fullscreen image lightbox — same zoom-in + pixel-block dissolve as the
          achievements certificate modal. */}
      {lightbox !== null && shots[lightbox] && (
        <GalleryLightbox
          shot={shots[lightbox]}
          index={lightbox}
          total={shots.length}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

/**
 * Fullscreen image lightbox opened by clicking a gallery card. Reuses the
 * achievements modal choreography: the panel zooms up and the image materializes
 * through a pixel-block dissolve, with a desktop mouse-tilt. Closes on the
 * backdrop, the ✕ button, or Escape (quick zoom-down before unmount); body
 * scroll is locked while open.
 */
function GalleryLightbox({
  shot,
  index,
  total,
  onClose,
}: {
  shot: { src: string; caption: string };
  index: number;
  total: number;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);

  const close = () => achievementModalOut(backdrop.current!, panel.current!, onClose);

  useEffect(() => {
    const tiles = root.current!.querySelectorAll("[data-block]");
    const tl = achievementModalIn(backdrop.current!, panel.current!, tiles);
    const stopTilt = achievementCardTilt(card.current!, card.current!);
    return () => {
      tl.kill();
      stopTilt();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={shot.caption}
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
    >
      <div
        ref={backdrop}
        onClick={close}
        className="absolute inset-0 bg-black/60 backdrop-blur-xl"
      />
      <div
        ref={panel}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full will-change-transform [perspective:1200px]"
        // Cap the width by the AVAILABLE HEIGHT so the 16:9 card + caption always
        // fit on screen: min of the 72rem desktop width and the width whose 16:9
        // height leaves room for the caption/padding (~9rem). Without this the
        // card overflows a short (laptop) viewport and the caption/✕ get clipped.
        style={{ maxWidth: "min(72rem, calc((100vh - 9rem) * 16 / 9))" }}
      >
        <div
          ref={card}
          className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-white/15 will-change-transform"
        >
          <Image
            src={shot.src}
            alt={shot.caption}
            fill
            sizes="90vw"
            className="object-cover"
            priority
          />
          {/* Pixel-block dissolve — tiles cover the image, then pop out on
              entry. NB: the grid container must stay transparent (no bg) — a
              background here would sit ON TOP of the image once the tiles fade
              and leave the card blank. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 grid gap-px"
            style={{
              gridTemplateColumns: `repeat(${LIGHTBOX_COLS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${LIGHTBOX_ROWS}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: LIGHTBOX_TILES }).map((_, i) => (
              <div key={i} data-block className="bg-black" />
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-start justify-between gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
              {shot.caption}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="shrink-0 rounded-full border border-white/15 px-3 py-1 font-mono text-xs uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:border-white/40 hover:text-white"
          >
            Esc ✕
          </button>
        </div>
      </div>
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
