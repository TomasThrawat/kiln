import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["@instruktlabs/kiln", "three", "sharp", "manifold-3d", "xatlasjs", "@napi-rs/canvas"],
};

export default nextConfig;
