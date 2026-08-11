"use client";

// -----------------------------------------------------------------------------
// Career — a "living circuit" timeline (serpentine connector)
// -----------------------------------------------------------------------------
// Cards alternate left/right; a SERPENTINE line connects each card to the next
// with a rounded elbow — exit one card's inner edge, run across, round a corner,
// and drop into the next card's top (never touching, a small gap at each end).
// One scroll progress (scrubbed, `careerLineDraw`) drives everything through a
// single `render(p)`: the connectors draw in sequence (by cumulative length), a
// bright TIP rides the draw front, small NODES light up where the line meets each
// card (the top "Present" node pulses), each card SLIDES + SCRAMBLES in as the
// line reaches it, and the reached card takes the accent-glow focus.
//
// Geometry is MEASURED (rebuilt on resize). Mobile (<lg): single stacked column
// with one straight vertical line down the left edge (no serpentine), same
// nodes/tip/reveal.
//
// Reduced motion: `render(1)` draws it fully + lights nodes (no tip/pulse) and
// cards sit at rest.
// -----------------------------------------------------------------------------

import { useRef } from "react";
import Image from "next/image";
import { gsap, useGSAP } from "@/lib/gsap";
import { careerLineDraw, prefersReducedMotion } from "@/lib/animations";
import { CAREER as C } from "@/lib/motion";
import { CAREER as ENTRIES, type CareerEntry } from "@/lib/career";
import { ScrambleText } from "@/components/ScrambleText";

const MOBILE_LINE_X = 10; // px from the wrapper's left edge for the mobile line
const CORNER = 16; // elbow corner radius (px)
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

type Seg = { path: SVGPathElement; len: number; cumBefore: number };
type Scene = {
  segs: Seg[];
  total: number;
  reachAt: number[]; // draw fraction at which the line reaches each card
  cards: HTMLElement[];
};

function CareerLogo({ entry }: { entry: CareerEntry }) {
  if (entry.logo) {
    return (
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-950 ring-1 ring-white/10">
        <Image src={entry.logo} alt={`${entry.company} logo`} fill sizes="40px" className="object-contain p-1" />
      </span>
    );
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-950 font-mono text-sm font-semibold text-zinc-400 ring-1 ring-white/10">
      {entry.company.charAt(0)}
    </span>
  );
}

function CareerCard({ entry, marker }: { entry: CareerEntry; marker: string }) {
  return (
    <article {...{ [marker]: "" }} className="career-card w-full max-w-sm rounded-2xl bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <CareerLogo entry={entry} />
          <div className="min-w-0">
            <ScrambleText as="p" entrance="observer" className="truncate text-sm font-medium text-white">
              {entry.company}
            </ScrambleText>
            <ScrambleText
              as="p"
              entrance="observer"
              className="font-mono text-[11px] uppercase tracking-[0.15em] text-blue-400"
            >
              {entry.title}
            </ScrambleText>
          </div>
        </div>
        <span className="shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">
          {entry.period}
        </span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-zinc-400">{entry.description}</p>
    </article>
  );
}

export function Career() {
  const section = useRef<HTMLElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const segRefs = useRef<(SVGPathElement | null)[]>([]);
  const nodeRefs = useRef<(SVGCircleElement | null)[]>([]);
  const pulseRef = useRef<SVGCircleElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);

  useGSAP(
    () => {
      const wrap = wrapper.current;
      const sec = section.current;
      if (!wrap || !sec) return;

      // Measure cards → lay out the serpentine (desktop) or a single left line
      // (mobile). Also positions the connection nodes + the present-pulse.
      const buildScene = (isDesktop: boolean, cardSel: string): Scene => {
        const cards = gsap.utils.toArray<HTMLElement>(cardSel, wrap);
        const wr = wrap.getBoundingClientRect();
        const m = cards.map((c) => {
          const r = c.getBoundingClientRect();
          return {
            left: r.left - wr.left,
            right: r.right - wr.left,
            top: r.top - wr.top,
            cy: r.top - wr.top + r.height / 2,
          };
        });

        const segs: Seg[] = [];
        const nodePos: { x: number; y: number }[] = [];
        let cum = 0;

        if (isDesktop) {
          for (let j = 0; j < cards.length - 1; j++) {
            const a = m[j];
            const b = m[j + 1];
            const exitX = ENTRIES[j].side === "left" ? a.right + C.gap : a.left - C.gap;
            const exitY = a.cy;
            const dropX = (b.left + b.right) / 2; // drop onto the next card's TOP-CENTER
            const dropEndY = b.top - C.gap;
            const dir = dropX >= exitX ? 1 : -1;
            const R = Math.max(2, Math.min(CORNER, Math.abs(dropX - exitX) / 2, Math.abs(dropEndY - exitY) / 2));
            const d = `M ${exitX} ${exitY} H ${dropX - dir * R} Q ${dropX} ${exitY} ${dropX} ${exitY + R} V ${dropEndY}`;
            const path = segRefs.current[j];
            if (!path) continue;
            path.setAttribute("d", d);
            const len = path.getTotalLength();
            gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
            segs.push({ path, len, cumBefore: cum });
            cum += len;
            if (j === 0) nodePos.push({ x: exitX, y: exitY }); // first card's exit
            nodePos.push({ x: dropX, y: dropEndY }); // each next card's entry
          }
        } else {
          const y0 = m[0]?.cy ?? 0;
          const yLast = m[m.length - 1]?.cy ?? 0;
          const path = segRefs.current[0];
          if (path) {
            path.setAttribute("d", `M ${MOBILE_LINE_X} ${y0} V ${yLast}`);
            const len = Math.max(path.getTotalLength(), 1);
            gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
            segs.push({ path, len, cumBefore: 0 });
            cum = len;
          }
          m.forEach((mm) => nodePos.push({ x: MOBILE_LINE_X, y: mm.cy }));
        }

        // Clear any unused connector paths (mobile uses one; desktop uses n-1).
        for (let j = segs.length; j < segRefs.current.length; j++)
          segRefs.current[j]?.setAttribute("d", "");

        const total = Math.max(cum, 1);
        const reachAt = cards.map((_, i) =>
          isDesktop
            ? i === 0
              ? 0
              : (segs[i - 1].cumBefore + segs[i - 1].len) / total
            : (m[i].cy - (m[0]?.cy ?? 0)) / total,
        );

        // Position the nodes + present-pulse.
        nodePos.forEach((pos, i) => {
          const nd = nodeRefs.current[i];
          if (nd) {
            nd.setAttribute("cx", String(pos.x));
            nd.setAttribute("cy", String(pos.y));
          }
        });
        if (pulseRef.current && nodePos[0]) {
          pulseRef.current.setAttribute("cx", String(nodePos[0].x));
          pulseRef.current.setAttribute("cy", String(nodePos[0].y));
        }
        return { segs, total, reachAt, cards };
      };

      const revealDir = (isDesktop: boolean, i: number) =>
        isDesktop && ENTRIES[i].side === "left" ? 1 : -1;

      const setup = (isDesktop: boolean, cardSel: string) => {
        const reduced = prefersReducedMotion();
        let scene = buildScene(isDesktop, cardSel);
        let prevActive = -1;
        const revealed = scene.cards.map(() => reduced);

        // At rest we CLEAR the inline transform so the CSS hover-scale can win.
        const rest = (card: HTMLElement) => {
          gsap.set(card, { opacity: 1 });
          card.style.transform = "";
        };
        scene.cards.forEach((card, i) => {
          if (reduced) rest(card);
          else gsap.set(card, { opacity: 0, x: revealDir(isDesktop, i) * 30 });
        });
        const playReveal = (i: number) =>
          gsap.to(scene.cards[i], {
            opacity: 1,
            x: 0,
            duration: 0.6,
            ease: "power3.out",
            onComplete: () => rest(scene.cards[i]),
          });

        // Paint everything from one progress value.
        const render = (p: number) => {
          const { segs, total, reachAt, cards } = scene;
          const globalLen = clamp(p, 0, 1) * total;
          // Draw each connector segment in sequence (cumulative length).
          segs.forEach((s) => {
            const drawn = clamp(globalLen - s.cumBefore, 0, s.len);
            s.path.style.strokeDashoffset = String(s.len - drawn);
          });
          // Bright tip rides the draw front along whichever segment is drawing.
          const tip = tipRef.current;
          if (tip) {
            if (p > 0.002 && p < 0.999 && segs.length) {
              let seg = segs[0];
              for (const s of segs) if (globalLen >= s.cumBefore) seg = s;
              const local = clamp(globalLen - seg.cumBefore, 0, seg.len);
              const pt = seg.path.getPointAtLength(local);
              tip.setAttribute("cx", String(pt.x));
              tip.setAttribute("cy", String(pt.y));
              tip.style.opacity = "1";
            } else {
              tip.style.opacity = "0";
            }
          }
          // Nodes light up + cards reveal as the line reaches each.
          let active = -1;
          reachAt.forEach((ra, i) => {
            const nd = nodeRefs.current[i];
            if (nd) {
              const amt = clamp((p - (ra - 0.02)) / 0.05, 0, 1);
              nd.setAttribute("r", String(C.node + (C.nodeFlare - C.node) * amt));
              nd.style.opacity = String(0.28 + 0.72 * amt);
            }
            if (!revealed[i] && p >= Math.max(0, ra - 0.06)) {
              revealed[i] = true;
              playReveal(i);
            }
            if (p >= ra - 0.001) active = i;
          });
          if (active !== prevActive) {
            cards.forEach((c, i) => c.classList.toggle("is-active", i === active));
            prevActive = active;
          }
        };

        let anim = careerLineDraw(sec, render);

        const redraw = () => {
          anim?.scrollTrigger?.kill();
          anim?.kill();
          scene = buildScene(isDesktop, cardSel);
          prevActive = -1;
          scene.cards.forEach((card, i) => {
            if (reduced || revealed[i]) rest(card);
            else gsap.set(card, { opacity: 0, x: revealDir(isDesktop, i) * 30 });
          });
          anim = careerLineDraw(sec, render);
        };
        const settle = gsap.delayedCall(0.35, redraw);
        let resizeId = 0;
        const onResize = () => {
          window.clearTimeout(resizeId);
          resizeId = window.setTimeout(redraw, 200);
        };
        window.addEventListener("resize", onResize);

        return () => {
          window.removeEventListener("resize", onResize);
          window.clearTimeout(resizeId);
          settle.kill();
          anim?.scrollTrigger?.kill();
          anim?.kill();
        };
      };

      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => setup(true, "[data-career-card]"));
      mm.add("(max-width: 1023px)", () => setup(false, "[data-career-card-m]"));

      return () => mm.revert();
    },
    { scope: section },
  );

  return (
    <section id="career" ref={section} className="relative border-t border-white/5 px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <ScrambleText
          as="p"
          entrance="observer"
          className="mb-16 font-mono text-xs uppercase tracking-[0.3em] text-blue-400"
        >
          — Career
        </ScrambleText>

        <div ref={wrapper} className="relative mx-auto max-w-5xl">
          <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            {/* One elbow connector per consecutive pair (n-1); mobile uses just #0. */}
            {ENTRIES.map((_, i) => (
              <path
                key={`s${i}`}
                ref={(el) => {
                  segRefs.current[i] = el;
                }}
                className="career-line"
                fill="none"
                stroke={C.color}
                strokeWidth={C.stroke}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {/* Present-node pulse (behind the node dot). */}
            <circle ref={pulseRef} className="career-node-pulse" fill={C.color} r={C.nodeFlare} />
            {/* A node where the line meets each card. */}
            {ENTRIES.map((_, i) => (
              <circle
                key={`n${i}`}
                ref={(el) => {
                  nodeRefs.current[i] = el;
                }}
                className="career-line"
                fill={C.color}
                r={C.node}
              />
            ))}
            {/* Bright leading tip riding the draw front. */}
            <circle ref={tipRef} className="career-tip" fill="#ffffff" r={C.tip} opacity={0} />
          </svg>

          {/* Desktop: alternating left/right cards. */}
          <div className="hidden flex-col gap-20 lg:flex">
            {ENTRIES.map((entry, i) => (
              <div key={i} className="grid grid-cols-2 items-center">
                <div className="flex justify-start">
                  {entry.side === "left" && <CareerCard entry={entry} marker="data-career-card" />}
                </div>
                <div className="flex justify-end">
                  {entry.side === "right" && <CareerCard entry={entry} marker="data-career-card" />}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: single stacked column, line down the left edge. */}
          <div className="flex flex-col gap-8 pl-8 lg:hidden">
            {ENTRIES.map((entry, i) => (
              <CareerCard key={i} entry={entry} marker="data-career-card-m" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
