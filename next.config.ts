import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_FIREBASE_CONFIG: process.env.FIREBASE_WEBAPP_CONFIG,
  },
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
