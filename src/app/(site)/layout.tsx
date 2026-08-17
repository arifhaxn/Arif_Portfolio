import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { HeadScanProvider } from "@/components/providers/HeadScanProvider";
import { QualityTierMarker } from "@/components/providers/QualityTierMarker";
import { Navbar } from "@/components/Navbar";
import { PixelReveal } from "@/components/PixelReveal";
import { CursorDot } from "@/components/CursorDot";
import { MediaGuard } from "@/components/MediaGuard";
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
      {/* Opts this document into the large-display UI scale (globals.css keys the
          fluid root font-size off `html:has([data-site-scale])`). It's a marker,
          not a wrapper: `hidden` means display:none, so it adds no box and can't
          disturb the body → main flex chain. Server-rendered, so the scale is in
          effect on the very first paint — no unscaled flash. /admin has no such
          marker and therefore keeps the browser's own text size. */}
      <div data-site-scale hidden />
      {/* Stamp data-quality-tier on <html> so CSS ambient animations can scale
          down on weak devices (same tier the 3D HeroHead uses). */}
      <QualityTierMarker />
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
      {/* Kills the native drag ghost and the "Copy image" context menu on images
          and the WebGL canvases — the same "page copy isn't yours to lift" intent
          as the site-wide user-select:none. Public site only; /admin keeps both. */}
      <MediaGuard />
    </>
  );
}
