import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
