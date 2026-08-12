// -----------------------------------------------------------------------------
// Home page
// -----------------------------------------------------------------------------
// The landing is a single screen: just the Hero (enlarged robot + nameplate).
// Projects, About, and Achievements each live on their own route. The fixed
// Navbar, Lenis smooth scroll, synced ScrollTrigger, and the PixelReveal
// transition all come from the root layout.
// -----------------------------------------------------------------------------

import { Hero } from "@/components/Hero";
import { IntroPreloader } from "@/components/IntroPreloader";
import { getHero } from "@/lib/content";

export default async function Home() {
  const hero = await getHero();
  return (
    <main className="flex flex-1 flex-col bg-black">
      <Hero hero={hero} />
      {/* First-load entrance: logo cover → docks into the navbar → reveals. */}
      <IntroPreloader />
    </main>
  );
}
