import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  webpack: (config) => {
    // @react-pdf/renderer uses canvas and other Node modules — exclude from server bundle
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
