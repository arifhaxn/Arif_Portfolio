import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Surfaces the deployed commit to the client so CrashDiag can report exactly
  // which build produced a log — "is the fix even live?" should be a fact, not
  // an inference from chunk hashes. Vercel sets VERCEL_GIT_COMMIT_SHA.
  env: {
    NEXT_PUBLIC_BUILD_SHA: (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 8),
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
