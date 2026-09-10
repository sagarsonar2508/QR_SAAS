import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "bcryptjs", "sharp"],

  // Lets deploymentScript/deploy-local.sh build into a staging directory
  // (.next-build) while the live .next keeps serving. The server then swaps the
  // finished build in atomically, so the redirect path is never pointed at a
  // half-written directory. Defaults to .next for normal `npm run build`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
