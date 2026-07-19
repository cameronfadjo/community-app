import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile workspace packages so `"use client"` directives and JSX
  // are handled correctly by the Next.js bundler.
  transpilePackages: ["@community/types", "@community/firebase", "@community/ui"],
};

export default nextConfig;
