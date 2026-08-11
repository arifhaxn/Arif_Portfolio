import type { Metadata } from "next";
import { Geist, Geist_Mono, Anton } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { HeadScanProvider } from "@/components/providers/HeadScanProvider";
import { Navbar } from "@/components/Navbar";
import { PixelReveal } from "@/components/PixelReveal";
import { CursorDot } from "@/components/CursorDot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Heavy condensed display face for the project case-study title (ProjectTitleReveal).
const anton = Anton({
  variable: "--font-anton",
  weight: "400", // Anton ships a single weight; it is already display-heavy
  subsets: ["latin"],
});

// Custom display face for the landing hero name (the big "Arif Hasan" title).
const relidux = localFont({
  src: "./fonts/Relidux.otf",
  variable: "--font-relidux",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arif — Portfolio",
  description: "Animation infrastructure ready.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `data-scroll-behavior="smooth"` asks Next.js 16 to restore its pre-16
    // scroll handling during SPA navigations, which cooperates with Lenis
    // instead of fighting it on route changes.
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} ${relidux.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Lenis + GSAP ticker are set up once, here at the root, so every route
            inherits smooth scrolling and a synced ScrollTrigger. The Navbar also
            lives here (not per-page) so it persists identically across every
            route — the homepage sections and the /achievements page alike. */}
        <HeadScanProvider>
          <SmoothScrollProvider>
            <Navbar />
            {children}
          </SmoothScrollProvider>
        </HeadScanProvider>
        {/* Pixel-reveal cover — one instance, persists across route changes and
            plays over everything (highest z-index). */}
        <PixelReveal />
        {/* Custom cursor — a white dot that eases toward the pointer, site-wide
            (fine-pointer devices only; leaves touch as-is). */}
        <CursorDot />
      </body>
    </html>
  );
}
