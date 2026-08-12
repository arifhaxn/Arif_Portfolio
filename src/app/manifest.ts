import type { MetadataRoute } from "next";

// Web app manifest — lets the site be "installed" (Android/desktop PWA) and run
// standalone. iPhone/Safari uses the apple-touch-icon (app/apple-icon.png) for the
// home-screen icon and the apple-mobile-web-app meta (see layout) for standalone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arif Hasan — Portfolio",
    short_name: "Arif Hasan",
    description: "Arif Hasan — full-stack developer. Portfolio, projects & work.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
