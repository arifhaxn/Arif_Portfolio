// -----------------------------------------------------------------------------
// Home page
// -----------------------------------------------------------------------------
// Composes the homepage sections: Hero (enlarged robot centerpiece + nameplate)
// and Projects. About now lives on its own /about route. This page stays a
// Server Component; the fixed Navbar, Lenis smooth scroll, synced ScrollTrigger,
// and the PixelReveal transition all come from the root layout.
// -----------------------------------------------------------------------------

import { Hero } from "@/components/Hero";
import { Projects } from "@/components/Projects";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-black">
      <Hero />
      <Projects />
    </main>
  );
}
