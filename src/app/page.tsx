// -----------------------------------------------------------------------------
// Home page
// -----------------------------------------------------------------------------
// Composes the homepage sections: Hero, Projects, About (all client components
// that run GSAP intros via useGSAP); this page stays a Server Component and just
// renders them. The fixed Navbar, Lenis smooth scroll, and synced ScrollTrigger
// all come from the root layout so they persist across every route.
// -----------------------------------------------------------------------------

import { Hero } from "@/components/Hero";
import { Projects } from "@/components/Projects";
import { About } from "@/components/About";

export default function Home() {
  return (
    // Navbar now lives in the root layout (persists across routes), so the
    // homepage only composes its own sections here.
    <main className="flex flex-1 flex-col bg-black">
      <Hero />
      <Projects />
      <About />
    </main>
  );
}
