import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
