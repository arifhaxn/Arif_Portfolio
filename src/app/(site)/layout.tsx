import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { HeadScanProvider } from "@/components/providers/HeadScanProvider";
import { Navbar } from "@/components/Navbar";
import { PixelReveal } from "@/components/PixelReveal";
import { CursorDot } from "@/components/CursorDot";
import { getNavbar } from "@/lib/content";

// (site) layout — the PUBLIC marketing-site chrome. Everything the landing pages
// rely on lives here (not the root layout) so it wraps only the public routes and
// never the /admin tool:
//   • Lenis smooth scroll + the shared GSAP ticker (SmoothScrollProvider),
//   • the persistent Navbar (its content comes from Firestore, content/navbar),
//   • the pixel-reveal route transition, and the custom cursor.
// This is the same tree that used to live in the root layout — moved verbatim, so
// the public pages render and behave exactly as before.
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nav = await getNavbar();
  return (
    <>
      <HeadScanProvider>
        <SmoothScrollProvider>
          <Navbar nav={nav} />
          {children}
        </SmoothScrollProvider>
      </HeadScanProvider>
      {/* Pixel-reveal cover — one instance, persists across route changes and
          plays over everything (highest z-index). */}
      <PixelReveal />
      {/* Custom cursor — a white dot that eases toward the pointer, site-wide
          (fine-pointer devices only; leaves touch as-is). */}
      <CursorDot />
    </>
  );
}
