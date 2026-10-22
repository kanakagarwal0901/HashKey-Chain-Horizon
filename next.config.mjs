/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      "ethers",
      "@hashgraph/sdk",
      "@0glabs/0g-ts-sdk",
    ],
  },
  // Allow Node.js crypto and fs in server route handlers
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
