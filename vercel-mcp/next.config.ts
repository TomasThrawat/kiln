import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@instruktlabs/kiln", "three", "sharp", "manifold-3d", "xatlasjs", "@napi-rs/canvas"],
  turbopack: {
    root: process.cwd(),
  },
};
export default nextConfig;
