import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The 3D models under /public are served with `max-age=0, must-revalidate` by
  // default, so robot.glb (585 KB) costs a conditional round-trip on every
  // visit even though it changes maybe once a year. A week of caching removes
  // that; stale-while-revalidate lets a returning visitor paint from cache while
  // a fresh copy is fetched behind them.
  // Deliberately NOT `immutable`: these filenames aren't content-hashed the way
  // /_next/static is, so a regenerated model (scripts/simplify-robot.mjs) has to
  // be able to reach people. If you do regenerate one, expect up to a week of
  // tail — rename it, or accept the delay.
  async headers() {
    return [
      {
        source: "/:path*.glb",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
  // Keep firebase-admin out of the bundler and load it as a real Node module at
  // runtime. Bundling it (Turbopack) breaks its transitive ESM dep (jwks-rsa ->
  // jose), which threw ERR_REQUIRE_ESM in the serverless runtime on the dynamic
  // /admin routes. Externalizing it lets Node's native loader handle the ESM.
  serverExternalPackages: ["firebase-admin"],
  images: {
    // Admin-uploaded images (project hero/gallery, logos, certificates) are hosted
    // on Cloudinary and referenced by their secure URL, so next/image has to allow
    // that host. Existing migrated images stay local under /public.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
