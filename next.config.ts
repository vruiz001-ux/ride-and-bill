import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Replace @libsql/client with web-only version (no native binaries)
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...config.resolve.alias,
        '@libsql/client': '@libsql/client/web',
      };
    }
    return config;
  },
};
export default nextConfig;
