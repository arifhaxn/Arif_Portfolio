// -----------------------------------------------------------------------------
// Home page
// -----------------------------------------------------------------------------
// The landing is a single screen: just the Hero (enlarged robot + nameplate).
// Projects, About, and Achievements each live on their own route. The fixed
// Navbar, Lenis smooth scroll, synced ScrollTrigger, and the PixelReveal
// transition all come from the root layout.
// -----------------------------------------------------------------------------

import { Hero } from "@/components/Hero";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-black">
      <Hero />
    </main>
  );
}
