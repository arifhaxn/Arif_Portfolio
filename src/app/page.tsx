// -----------------------------------------------------------------------------
// Home page
// -----------------------------------------------------------------------------
// Composes the two sections built so far: the fixed Navbar and the Hero. Both are
// client components (they run GSAP intros via useGSAP); this page stays a Server
// Component and just renders them. Lenis smooth scroll + synced ScrollTrigger
// come from the SmoothScrollProvider in the root layout.
// -----------------------------------------------------------------------------

import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-black">
      <Navbar />
      <Hero />
    </main>
  );
}
