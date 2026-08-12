import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Anton } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

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
  title: "Arif Hasan — Portfolio",
  description: "Arif Hasan — full-stack developer. Portfolio, projects & work.",
  // Standalone / home-screen behavior on iOS: added to the iPhone home screen it
  // shows app/apple-icon.png and opens full-screen (no Safari chrome), like an app.
  appleWebApp: {
    capable: true,
    title: "Arif Hasan",
    statusBarStyle: "black-translucent",
  },
};

// `viewportFit: "cover"` lets the page extend under the notch / home indicator so
// it feels edge-to-edge; components then use env(safe-area-inset-*) to keep chrome
// clear of them. themeColor tints the mobile browser UI black to match the site.
export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Root layout is intentionally MINIMAL: just <html>/<body>, the font variables,
// and global CSS. All the public-site chrome (Navbar, Lenis smooth scroll, the
// pixel-reveal transition, the custom cursor) now lives in the (site) route
// group's layout, so it wraps ONLY the public marketing pages. The /admin app is
// a sibling of (site) and therefore inherits none of it — a clean, plain, fast
// tool UI with a normal cursor and native scrolling. Route groups don't change
// URLs, so the public site's paths are unchanged.
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
