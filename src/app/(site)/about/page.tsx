// -----------------------------------------------------------------------------
// /about — server entry
// -----------------------------------------------------------------------------
// Reads the About page's content from Firestore (content/about, content/hero,
// content/career, content/footer) server-side via firebase-admin, then hands it
// to <AboutView> (the client component that owns all the animation/layout). This
// is a plumbing split only — the rendered page is identical to before.
// -----------------------------------------------------------------------------

import { AboutView } from "@/components/AboutView";
import { getAbout, getCareer, getFooter, getHero, getNavbar } from "@/lib/content";

export default async function AboutPage() {
  const [about, hero, career, footer, navbar] = await Promise.all([
    getAbout(),
    getHero(),
    getCareer(),
    getFooter(),
    getNavbar(),
  ]);

  return (
    <AboutView
      about={about}
      hero={hero}
      career={career}
      footer={footer}
      logo={navbar.wordmark.logo}
    />
  );
}
