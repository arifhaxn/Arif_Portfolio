# Arif Hasan — Portfolio

A motion-led personal portfolio built on a production-ready animation foundation
(GSAP + ScrollTrigger, Lenis smooth scrolling) with a React Three Fiber hero
centerpiece.

## Tech stack

- **[Next.js 16](https://nextjs.org)** (App Router, React 19, Turbopack)
- **[Tailwind CSS v4](https://tailwindcss.com)**
- **[GSAP](https://gsap.com) + ScrollTrigger** and **[@gsap/react](https://github.com/greensock/react)** (`useGSAP`)
- **[Lenis](https://github.com/darkroomengineering/lenis)** smooth scrolling, driven by the GSAP ticker (single synced RAF loop)
- **[React Three Fiber](https://r3f.docs.pmnd.rs) + drei + three** for the 3D hero visual
- **TypeScript**

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Project structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout — wraps the app in SmoothScrollProvider
│   └── page.tsx                # Home — composes Navbar + Hero
├── components/
│   ├── Navbar.tsx              # Wordmark + nav links, load-in stagger
│   ├── Hero.tsx                # Nameplate/eyebrow intro + 3D centerpiece
│   ├── HeroHead.tsx            # R3F wireframe icosahedron (mouse-tracked, pose cross-fade)
│   └── providers/
│       └── SmoothScrollProvider.tsx  # Lenis wired to the GSAP ticker + ScrollTrigger
└── lib/
    ├── gsap.ts                 # Central GSAP + plugin registration
    ├── motion.ts               # Motion design tokens (durations, easings, staggers)
    └── animations.ts           # Reusable animation utilities
```

## Animation foundation

- **`lib/gsap.ts`** registers ScrollTrigger and `useGSAP` once, client-side only.
- **`lib/motion.ts`** holds the motion spec as typed tokens so timings/easings live
  in one place.
- **`lib/animations.ts`** provides composable helpers (intro fades, scroll reveals,
  scrub parallax, pointer tilt, pose cross-fade, route wipe), each respecting
  `prefers-reduced-motion`.
- **`SmoothScrollProvider`** runs Lenis off the GSAP ticker so smooth scroll and
  every ScrollTrigger share one RAF loop.

## Hero 3D centerpiece

A wireframe **icosahedron** (placeholder for a photo-derived head model, revisited
later) with:

- Damped, `prefers-reduced-motion`-aware **mouse-tracking rotation**.
- A looping **pose cross-fade** between two facet orientations.
- Performance safeguards: capped pixel ratio, render loop paused off-screen via
  `IntersectionObserver`, and geometry disposal on unmount.
