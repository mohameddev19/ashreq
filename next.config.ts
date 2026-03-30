import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@mantine/core",
    "@mantine/hooks",
    "@mantine/form",
    "@mantine/notifications",
  ],
};

export default nextConfig;
