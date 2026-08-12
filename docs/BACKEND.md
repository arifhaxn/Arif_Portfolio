# Firebase Backend & Admin Panel — Full Reference

*Companion to `docs/CONTEXT.md` (which covers the frontend/motion build). This doc
covers the dynamic backend: Firebase-backed content, the admin CMS, and image
uploads. Paste this into a fresh chat so it understands how the site's content
system works before touching it.*

---

## 1. What this is (one paragraph)

The portfolio used to have all its text/data hardcoded in components. It's now a
**dynamic, self-editable site**: every piece of editable content lives in
**Firestore**, the public pages read it **server-side** via the Firebase Admin
SDK, and a private **admin panel** (`/admin`) lets the owner edit everything
through forms — text, projects, career, achievements — with **instant** updates
to the live site. Images uploaded through the admin go to **Cloudinary**. It was
built in 4 phases (see §12). Everything is wired and running; what's left is
committing/pushing and deploying to Vercel (§13).

**Stack:** Next.js 16 (App Router, Turbopack, React 19) · Firebase (Firestore +
Email/Password Auth) · Cloudinary (images) · Tailwind v4 · GSAP/R3F (frontend).

---

## 2. Quick start (run it locally)

```bash
cd clone-site
npm install
# .env.local must exist (see §5). Then, one time only, seed Firestore:
npm run migrate:firestore
# Start the dev server:
npm run dev
```

- **Public site:** http://localhost:3000
- **Admin panel:** http://localhost:3000/admin/login (log in with the Firebase
  Auth user's email/password)

> If routes 404 oddly after big file changes, the Turbopack cache is stale —
> stop the server, `rm -rf .next`, and restart.

---

## 3. Architecture / the golden rules

1. **All Firestore + data access is server-side, through `firebase-admin`.** The
   public pages are Server Components that read Firestore directly. Admin writes
   go through a single Server Action. The browser never talks to Firestore.
2. **The client Firebase SDK is used for exactly one thing: admin login** (email/
   password sign-in). After sign-in, the ID token is exchanged for an httpOnly
   **session cookie**, and every `/admin` request verifies that cookie
   server-side.
3. **Images are the only client-side upload** — straight to Cloudinary (no secret
   keys involved; uses an unsigned upload preset).
4. **Content vs. design is a hard line.** Only *content* (text, data, image URLs)
   lives in Firestore. All *design/behavior* (animation timings, layout, which
   elements scramble, colors) stays in code and was never moved.
5. **Caching:** public reads are wrapped in `unstable_cache` and tagged
   `content:<doc>`. Admin saves call `revalidateTag('content:<doc>', {expire:0})`
   so the change is live on the next visit — without making pages fully dynamic.

---

## 4. Firebase & Cloudinary setup (what exists in the consoles)

**Firebase project:** `arif-hasan-portfolio`
- **Firestore** — enabled (production mode). Holds one collection: `content`.
- **Authentication** — Email/Password enabled, with exactly **one admin user**.
  A valid session = authorized (no roles/claims).
- **Storage** — NOT used. Firebase now puts Storage behind the paid Blaze plan, so
  we use Cloudinary instead. (Firestore + Auth stay on the free Spark plan.)
- **Firestore security rules** should deny all client access (`allow read, write:
  if false;`) — the app only ever reaches Firestore through the Admin SDK, which
  bypasses rules.

**Cloudinary** (free, no credit card): cloud name `nbzcegku`, with an **unsigned**
upload preset named `Portfolio`. That's all image uploads need.

---

## 5. Environment variables (`.env.local`)

`.env.local` lives in `clone-site/` and is gitignored. `.env.local.example`
documents every key. Two credential sets + Cloudinary:

```
# Firebase Web config (client SDK — login + used by browser). Public by design.
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=arif-hasan-portfolio.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=arif-hasan-portfolio
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=arif-hasan-portfolio.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Service account (server SDK — firebase-admin). SECRET.
FIREBASE_ADMIN_PROJECT_ID=arif-hasan-portfolio
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-...@arif-hasan-portfolio.iam.gserviceaccount.com
# The PEM private key on ONE line with newlines written as literal \n. The code
# un-escapes it at runtime. Wrap in double quotes.
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Cloudinary (admin image uploads). Public by design.
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=nbzcegku
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=Portfolio
```

For **Vercel**, set every one of these in the project's Environment Variables, and
set the project's **Root Directory to `clone-site`**.

---

## 6. Data model — the `content/*` documents

One Firestore document per page/section, under the `content` collection. The
grouping is intentional — it's exactly the admin sidebar. TypeScript shapes are in
`src/lib/content-types.ts`. Structured item types (`Project`, `CareerEntry`,
`Achievement`) live in their original `src/lib/*.ts` files and are re-exported.

| Document              | Shape (summary)                                                                 |
| --------------------- | ------------------------------------------------------------------------------- |
| `content/navbar`      | `{ wordmark:{logo,alt,homeAriaLabel}, links:[{label,href,side}] }`              |
| `content/hero`        | `{ eyebrow, name, tagline:{primary,secondary}, ctaLabel, portraitImage, hud:{statusWords[],codingSinceYear,locationLabel,timeZone} }` |
| `content/about`       | `{ descriptionHeading:[{segments:[{text,accent?}]}], bio, skillsEyebrow, skills:[{label,items[]}], heroStatus:{location,availability,timeZone,scrollCue} }` |
| `content/career`      | `{ eyebrow, items: CareerEntry[] }`                                              |
| `content/projects`    | `{ items: Project[], caseStudy:{overviewLabel,metaLabels,viewRepository,launchWebsite,githubLabel,scrollCue,heroPlaceholder,galleryPlaceholder,nextProjectLabel} }` |
| `content/achievements`| `{ eyebrow, heading, subtitle, categoryOrder[], items: Achievement[] }`         |
| `content/footer`      | `{ eyebrow, note, email, tags[], copyLabel, copiedLabel, socialLinks:[{label,href,icon}], signoff[] }` (this is the /about contact area) |

Item shapes (unchanged from the original code):
- **Project:** `num, slug, name, description, stack[], repo, logo?, accent?, themeColor?, image?, heroImage?, gallery?:[{src,caption}], role?, year?, liveUrl?`
- **CareerEntry:** `company, logo?, title, description, period, side:"left"|"right"`
- **Achievement:** `id, title, issuer, category, image?`

**Firestore quirk to remember:** documents can't contain arrays-of-arrays. That's
why the About heading is `[{segments:[...]}]` (list of objects holding a list),
not `string[][]`.

**Deliberately NOT in Firestore** (stayed in code): SEO `<title>`/description, the
achievements live-stat labels (Elapsed/Switches), fallback strings shown only when
an image is missing, and a11y-only strings.

---

## 7. How the public site reads content

`src/lib/content.ts` (server-only) has one cached getter per document:

```ts
export const getHero = contentGetter<HeroContent>("hero"); // etc.
// contentGetter = unstable_cache(() => readDoc(id), ['content:'+id],
//                                { tags:['content:'+id], revalidate:false })
```

Server Components call these and pass the data as props to the (client)
presentation components:

- `app/layout.tsx` → root shell only (see §8).
- `app/(site)/layout.tsx` → `getNavbar()` → `<Navbar nav=…>` + the public chrome.
- `app/(site)/page.tsx` → `getHero()` → `<Hero hero=…>`.
- `app/(site)/about/page.tsx` → `getAbout/getHero/getCareer/getFooter` →
  `<AboutView …>`.
- `app/(site)/projects/page.tsx` → `getProjects()` → `<Projects projects=…>`.
- `app/(site)/projects/[slug]/page.tsx` → `getProjects()`, finds the slug,
  computes `nextProject(items, slug)` → `<ProjectCaseStudy>` + `<NextProjectChain>`.
  `generateStaticParams` also reads `getProjects()` for the slugs.
- `app/(site)/achievements/page.tsx` → `getAchievements()` → `<AchievementsView>`.

The two originally all-`"use client"` pages (about, achievements) were split into a
server page (data fetch) + a client `*View` component (the animation/layout).

---

## 8. Route structure & admin/public isolation

The public site uses a lot of global "chrome": a fixed Navbar, Lenis smooth
scroll, a custom cursor (hides the native cursor site-wide), and a pixel-reveal
route transition. None of that belongs on the plain admin tool. So:

```
app/
  layout.tsx                     ← ROOT: only <html>/<body> + fonts + globals
  (site)/                        ← route group (invisible in URLs)
    layout.tsx                   ← ALL the public chrome lives here
    page.tsx                     ← /
    about/ projects/ projects/[slug]/ achievements/
  admin/
    login/page.tsx               ← /admin/login  (root layout only — no chrome, NOT guarded)
    actions.ts                   ← logout() server action
    content-actions.ts           ← saveSection() server action (the write path)
    (dashboard)/                 ← route group
      layout.tsx                 ← AUTH GUARD + sidebar shell (guards everything inside)
      page.tsx                   ← /admin  → redirects to /admin/hero
      hero/ navbar/ about/ achievements/ projects/ career/ footer/  ← the 7 edit pages
  api/admin/session/route.ts     ← POST: mint the session cookie
```

Key points:
- Route groups (`(site)`, `(dashboard)`) don't change URLs — `/`, `/about`,
  `/admin/hero` are unaffected. They exist purely to scope layouts.
- `/admin/login` is a **sibling** of `(dashboard)`, so the auth-guard layout
  doesn't wrap it — no redirect loop.
- Public component code was never modified for this isolation; the chrome was just
  moved from the root layout into `(site)/layout.tsx` verbatim.

---

## 9. Admin auth flow

1. **Login** (`app/admin/login/page.tsx`, client): `signInWithEmailAndPassword`
   via the client SDK → get the ID token → `POST /api/admin/session`.
2. **Session route** (`app/api/admin/session/route.ts`): verifies the ID token,
   calls `adminAuth().createSessionCookie(...)`, sets an httpOnly, `secure`-in-prod
   cookie named `session`.
3. **Guard** (`app/admin/(dashboard)/layout.tsx`): every request calls
   `getVerifiedAdmin()` (`src/lib/admin-auth.ts`) which reads the cookie and runs
   `verifySessionCookie(cookie, /*checkRevoked*/ true)`. Missing/invalid/expired/
   revoked → `redirect('/admin/login')`. Verified logged-out access is a 307 to
   login (confirmed).
4. **Logout** (`app/admin/actions.ts`, `logout` server action): revokes the
   session's refresh tokens (so the cookie can't be replayed), clears the cookie,
   redirects to login.

`src/lib/firebase-admin.ts` exports `adminAuth()`, `adminDb()`, `adminStorage()`
(lazy singletons; `server-only`, so importing from client code is a build error).

---

## 10. Admin editing & the write path

**Every save goes through one Server Action:** `saveSection(docId, data)` in
`app/admin/content-actions.ts`. It:
1. re-verifies the admin session (`getVerifiedAdmin()`) — never trusts the caller,
2. validates the payload for that document's shape (required fields present),
3. deep-strips `undefined` (Firestore rejects it) and `.set()`s the whole document,
4. `revalidateTag('content:'+docId, {expire:0})` so the public site updates on the
   next visit.

Returns `{ok:true} | {ok:false,error}`; forms show the error instead of failing
silently.

**Forms** (all under `src/components/admin/forms/`):
- `formkit.tsx` — shared primitives: `useSectionSave` hook, `SaveStatusText`,
  `Field`, `TextInput`, `TextArea`, `Select`, `Button`, `StringList` (edit a list
  of strings), `InlineList` (edit a list of objects inline), `ImageField`,
  `SectionShell`.
- `CrudList.tsx` — master/detail editor for the structured sections: list rows with
  Edit / Delete (confirm) / ↑↓ reorder, an add/edit item form, persists the whole
  `items` array on each change.
- Copy sections: `HeroForm`, `NavbarForm`, `AboutForm`, `FooterForm` (edit fields,
  one Save).
- Structured sections: `CareerForm`, `ProjectsForm`, `AchievementsForm` (section
  copy + a `CrudList` of items).

**Admin pages read FRESH** (uncached) via `getSectionForAdmin(id)`
(`src/lib/content-admin.ts`) so the form always shows current data — not the cached
public snapshot.

**Data preservation:** the Projects form loads the full project (via
`structuredClone`) and binds inputs for every field, and always writes
`{...doc, items}` so `caseStudy` and untouched optional fields (e.g. LeadUnity's
gallery) are never dropped.

---

## 11. Image upload (Cloudinary)

`ImageField` in `formkit.tsx`:
- On file select, POSTs the file to
  `https://api.cloudinary.com/v1_1/nbzcegku/image/upload` with the unsigned preset
  `Portfolio` and a `folder` of `portfolio/<section>/…`.
- Stores the returned `secure_url` as the field value; shows a preview; has an
  uploading state + retry on failure.
- The raw path/URL text box stays editable, so existing **local** image paths
  (`/projects/…` under `public/`) are preserved untouched unless you replace them.

`next.config.ts` allows `res.cloudinary.com` in `images.remotePatterns` so
`next/image` can render uploaded images. Existing images stay local in `public/`.

---

## 12. The 4 build phases (history)

1. **Phase 1 — Firestore content + public reads.** Audited all hardcoded strings,
   defined the 7-doc model, wrote the migration (`scripts/migrate-to-firestore.ts`),
   converted every public page to read from Firestore server-side.
2. **Phase 2 — admin shell.** Login, session-cookie auth, the guarded sidebar
   shell, the route-group isolation, placeholder section pages.
3. **Phase 3 — edit forms.** Full CRUD for career/projects/achievements, field
   editing for the copy sections, and image upload.
4. **Phase 4 — count-scaling audit.** Verified the career line, achievements grid,
   and projects marquee all compute from array length / measured DOM (not hardcoded
   counts). Fixed one edge bug: a single-entry career timeline rendered a stray
   node/pulse at the SVG origin.

---

## 13. Gotchas & pending work

**Gotchas**
- **Stale `.next`:** after moving/renaming routes, Turbopack's incremental cache can
  serve phantom 404s. Fix: stop server, `rm -rf .next`, restart.
- **External links need a scheme:** admins often type `example.com` without
  `https://`, which an `<a href>` treats as an internal path. `src/lib/url.ts`
  `externalHref()` auto-prepends `https://`; it's applied to project repo/live-URL
  links and the About social links. Use it for any new admin-entered external link.
- **`revalidateTag` is 2-arg in Next 16** — the single-arg form is deprecated and
  TS-errors. Use `revalidateTag(tag, {expire:0})` (immediate) or `(tag, 'max')`
  (stale-while-revalidate).
- **`next build` runs ESLint** — the uncommitted robot-WIP files `CursorDot.tsx`
  and `HeroHead.tsx` have pre-existing react-hooks lint errors from Next 16's newer
  rules that will fail the build. Fix those (they're unrelated to this backend work)
  before building/deploying.

**Pending**
- Commit + push the backend work (was not committed yet; keep the robot WIP out of
  those commits).
- Fix the two robot-WIP lint errors so `next build` passes.
- Deploy to Vercel (Root Directory = `clone-site`, add all env vars).

---

## 14. How to extend

- **Add a field to a section:** add it to the interface in `content-types.ts`, add
  an input in that section's form, add it to the seed in `migrate-to-firestore.ts`
  (or set it once via the admin), and render it in the public component from props.
  Add a validation check in `content-actions.ts` if it's required.
- **Add a whole new section/document:** add an entry to `ADMIN_SECTIONS`
  (`src/lib/admin-sections.ts`), a getter in `content.ts`, a validator branch in
  `content-actions.ts`, a form component, and an `app/admin/(dashboard)/<slug>/page.tsx`.
- **Add an image field:** use `<ImageField storagePath="…">` — it handles the
  Cloudinary upload and preview automatically.
```
