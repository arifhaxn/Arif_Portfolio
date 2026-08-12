# Portfolio Build — Full Context Handoff

*Paste this into a fresh Claude chat so it has the complete picture before it writes the next task prompt.*

---

## 0. Your role, and how this workflow runs

You are the **prompt-writing chat**. You do **not** write code. Your job is to take:

- **SS** = **screenshots** (still frames) of an *inspiration website*, and
- **SR** = **screen recordings** (short clips) of that same site — these capture the **motion**: how things animate on load, on scroll, on hover, and how 3D elements move.

…and turn them into **one detailed, self-contained task prompt** at a time. The site owner (Arif) pastes each prompt into **Claude Code** (a separate agent that has the actual repo open and writes/commits the code). One prompt = one focused task, mirroring how the site has been built so far.

**Why SS + SR both matter:** a screenshot tells you *what a section looks like at rest*; a recording tells you *how it behaves* — entrance staggers, scroll-scrub timing, pinning, cross-fades, pointer tracking, easing character (snappy vs. floaty). Every prompt you write should translate the recording into concrete motion instructions (durations, easings, staggers, triggers, reduced-motion fallbacks), not just "add an animation."

**One important framing:** this is *inspired by* the reference site, not a pixel clone. The layout/motion language is borrowed and adapted to Arif's own content and identity. Don't prompt to copy their text, logos, or personal data — only the structure and motion feel.

---

## 1. What the project is

**Arif Hasan's personal portfolio** — a motion-led single-page site. Dark, minimal, "HUD/technical" aesthetic (mono uppercase micro-labels, thin lines, a wireframe 3D centerpiece). Built section by section from the reference site's motion language.

- **Repo:** https://github.com/arifhaxn/Arif_Portfolio (branch `main`). Claude Code commits and pushes here after each task.
- **Code location:** everything lives in the `clone-site/` subfolder (a Next.js app). *(The folder is named "clone-site" for historical reasons; the site is original content.)*

---

## 2. Tech stack (already chosen — don't re-prompt this)

- **Next.js 16** (App Router, React 19, Turbopack) + **TypeScript**
- **Tailwind CSS v4** for styling
- **GSAP + ScrollTrigger** for all animation, with **`@gsap/react` (`useGSAP`)** for scoped setup + auto-cleanup
- **Lenis** smooth scrolling, driven off the **GSAP ticker** (one shared RAF loop, so scroll-linked animations never jitter)
- **React Three Fiber + drei + three** for the 3D visuals

---

## 3. Architecture & conventions (every prompt must respect these)

The animation system is **centralized** — new work reuses it instead of hard-coding values. When you write a prompt, tell Claude Code to follow these:

- **`src/lib/motion.ts`** — the single source of motion *design tokens*: named `DURATION`, `EASE`, `STAGGER`, `SCRUB`, `START` values lifted from a motion spec. New timings should be added here, not sprinkled in components.
- **`src/lib/animations.ts`** — composable GSAP *helper functions* (one per motion pattern), e.g. `navIntro`, `heroTitleIn`, `idlePoseSwap`, `headPointerTilt`, `scrollReveal`, `marqueeRowFocus`, `thumbRailSwap`, `floatLoop`. **Every helper already handles `prefers-reduced-motion`** (it snaps to the end state instead of animating). Components call these — they never call `gsap` raw.
- **`src/lib/gsap.ts`** — registers GSAP plugins once, client-side.
- **`SmoothScrollProvider`** (in the root layout) wires Lenis to the GSAP ticker and refreshes ScrollTrigger.

**Recurring rules baked into the codebase (keep prompting them):**
1. **Reduced motion is mandatory** — every animation needs a `prefers-reduced-motion` fallback.
2. **Mobile drops the heavy scroll choreography** — on desktop (`lg+`) sections use pinning + scroll-scrub; on mobile (`<lg`) those are dropped in favor of simple one-shot `scrollReveal`s. This split is an established pattern.
3. **3D is client-only** — R3F `<Canvas>` components load via `next/dynamic` with `ssr:false`, inside a sized wrapper that reserves space (no layout shift).
4. **Performance safeguards on 3D** — capped device pixel ratio, `IntersectionObserver` pauses the render loop off-screen, geometry disposed on unmount.
5. **Placeholders are explicitly flagged** in comments (searchable markers), never silently invented content.
6. **AGENTS.md note:** this Next.js 16 has breaking changes vs. older versions — Claude Code is told to check `node_modules/next/dist/docs/` before writing Next-specific code.

---

## 4. What's been built so far (4 commits)

The page (`src/app/page.tsx`) composes, top to bottom: **Navbar → Hero → Projects → About**.

### Navbar (`components/Navbar.tsx`)
Fixed top bar. Wordmark **"AH"** on the left; links **Projects / About / Playground / Contact** on the right. Plays a **load-in stagger** (each item fades in + drops down `-8px`, ~0.075s apart, power3.out) via `navIntro`. Semi-transparent black background + backdrop blur so 3D wireframe edges don't bleed through.

### Hero (`components/Hero.tsx`)
Full-screen, centered. **3D wireframe icosahedron** at the top (the "head" centerpiece), then the nameplate below: eyebrow `/ FULL-STACK DEVELOPER`, big `Arif Hasan`, and a one-line tagline. Nameplate lines fade + rise (`y:20→0`) staggered, entering just *after* the nav so the eye reads nav→hero. Bottom corners hold **HUD** elements (see below).

The **3D head** (`components/HeroHead.tsx`) is a shared component:
- A wireframe **icosahedron** (default `shape`), dim-gray lines.
- **Pointer tilt** — the shape eases toward the cursor (damped lerp, small angle range) via `headPointerTilt`. No fine pointer / reduced-motion → stays neutral.
- **Pose cross-fade** — two overlapping copies at slightly different angles crossfade on a 4–6s hold loop (`idlePoseSwap`).

### HUD (`components/Hud.tsx`) — shared by Hero & About
- **`<LiveStatus>`** — a live ticking clock in Arif's timezone (Sylhet, `Asia/Dhaka`, GMT+6) + a rotating status word (BUILDING / LEARNING / SHIPPING) that crossfades.
- **`<CodingSince>`** — a bottom-right "YEAR / CODING SINCE" meta. ⚠ Year is a placeholder (`20XX`).

### Projects (`components/Projects.tsx` + `ThumbnailCard.tsx` + `lib/projects.ts`)
A **pinned, scroll-scrubbed marquee** on desktop:
- Left column: tall stack of large project-name rows. The row nearest viewport-center scrubs **dim→bright→dim** (`marqueeRowFocus`) so only the "active" row is white.
- Right column: **pinned** for the whole section; shows a stack of project cards (thumbnail + description + stack + GitHub link). As the active row changes, the old card exits and the new one enters via `thumbRailSwap`.
- A large **ambient wireframe polyhedron** sits behind the whole section (sticky, dimmed, zooms in once on enter).
- **Mobile:** pin/scrub/3D dropped — each project is a plain block that reveals once.
- **Data:** 6 real projects live in `lib/projects.ts` (LeadUnity, OnePick, Chessy, Claster, OneTELE, Career Logic AI) — each with description, tech stack, and GitHub URL. Thumbnails are currently styled placeholders; dropping a screenshot path into the data flips them to real images with no code change.

### About (`components/About.tsx`)
Hero-style structure: a **robot 3D centerpiece** (the same `HeroHead` in `shape="robot"`) with small floating decorative props drifting around it (`floatLoop`), then eyebrow `/ About` → heading "Building. Learning. Shipping." → bio, followed by scrolling content blocks that reveal on enter:
- **Skills** — grouped grid (Languages, Frontend, Backend, Database, Infra, Tools).
- **Achievements** — ⚠ intentionally **empty** "Coming soon" slots (no invented awards).
- **Connect** (`id="contact"`, where the nav's Contact link lands) — social links: GitHub, LinkedIn, Instagram, Facebook, Email.

### The 3D robot pipeline
- `public/robot-backup.glb` — 25 MB pristine 3D scan (kept locally, gitignored).
- `scripts/simplify-robot.mjs` — reduces it (gltf-transform + meshopt) to `public/robot.glb` (~50K triangles, 598 KB, committed).
- The robot renders as a bright, glowing wireframe/edge figure — the "android" centerpiece of the About section.

---

## 5. Current work-in-progress (uncommitted — the last thing in flight)

`components/HeroHead.tsx` has an **uncommitted change** reworking how the robot is drawn:
- **Before:** full dense wireframe (every triangle edge) → visually cluttered.
- **Now (WIP):** **crease edges only** via `THREE.EdgesGeometry` at a **15° threshold** — only edges where adjacent faces meet at >15° are drawn, so flat-triangulation diagonals drop out and the robot reads as clean facets. There's also a targeted fix removing duplicate edges that showed through the see-through eye sockets. Still bright additive lines + a CSS glow.

It **builds and runs with zero errors**. It just hasn't been visually signed off or committed yet. **Next physical step:** view the About-section robot, confirm the look (or adjust the 15° angle), then commit + push.

---

## 6. Placeholders & open items still to resolve

- **Coding-since year** — `20XX` in `Hud.tsx` needs the real year.
- **Bio paragraph** — About section has a draft bio to be rewritten in Arif's voice.
- **Achievements** — empty slots awaiting real accomplishments (don't invent).
- **Playground section — MISSING.** The navbar links to `#playground`, but no such section exists yet. This is a planned future section (likely an interactive/experimental showcase — the reference site presumably has one; use its SS/SR to define it).
- **Project thumbnails** — still placeholder cards; real screenshots can be dropped in later.

---

## 7. What we'll do next (the road ahead — you'll prompt these one at a time)

Roughly in likely order:
1. **Finish the robot** — confirm/commit the crease-edge change (small, mostly done).
2. **Build the Playground section** — the biggest missing piece. Define it from the reference site's SS/SR: what it shows, its layout, and especially its motion (this is usually the most animation-heavy, "fun" section). Follow the established desktop-scroll / mobile-simple split.
3. **Fill real content** — coding-since year, rewritten bio, achievements, project thumbnails.
4. **Polish passes** — anything the reference site does that we haven't matched yet: page-load/preloader sequence, route/scroll transitions, hover micro-interactions, a footer, meta/SEO, favicon, responsive fine-tuning, accessibility.
5. **Ongoing:** each task ends with Claude Code committing + pushing to the repo.

---

## 8. How to write each prompt (guidance for you, the prompt chat)

When Arif gives you SS + SR for the next task, produce **one** prompt that:
- **Names the section/task** and where it fits in the existing page order.
- **Describes the rest state** from the SS: layout, hierarchy, type treatment, spacing, colors — mapped to the site's existing dark/HUD language.
- **Describes the motion** from the SR in concrete terms: what animates, trigger (load / scroll-into-view / scroll-scrub / hover / pointer), direction & distance, duration, easing character, stagger, and whether it pins.
- **Tells Claude Code to reuse the system:** add new timings to `lib/motion.ts`, build/extend a helper in `lib/animations.ts`, keep components calling helpers (not raw gsap).
- **Requires the standard safeguards:** `prefers-reduced-motion` fallback; desktop-heavy / mobile-simple split; 3D client-only + perf safeguards if 3D is involved.
- **Flags any unknown content as a placeholder** rather than inventing it.
- **Ends by asking Claude Code to commit + push.**

---

## 9. Confirmed owner facts (real data — safe to reference)

- **Name:** Arif Hasan · **Location:** Sylhet, Bangladesh · **Timezone:** Asia/Dhaka (GMT+6)
- **Role:** Full-stack developer · **Education:** BSc in Computer Science & Engineering
- **Skills:** Dart, C++, Python; Flutter; Node.js; Firebase, MongoDB; Vercel, Docker, Git; VS Code, Android Studio, Figma
- **Socials:** GitHub `arifhaxn`, LinkedIn `arif-hasan-672249358`, Instagram `arifhaxn`, Facebook `arifhaxnn`, Email `arifhasan.connect@gmail.com`
- **Projects (6):** LeadUnity (Flutter/Dart/NextJS), OnePick (C++/Dart), Chessy (Flutter/Dart), Claster (Flutter/Dart/Firebase), OneTELE (Flutter/Dart), Career Logic AI (Dart/Groq)
