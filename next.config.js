/** @type {import('next').NextConfig} */
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "/inspecta_deck";
const basePath =
  rawBasePath && rawBasePath !== "/" ? rawBasePath.replace(/\/$/, "") : "";

const nextConfig = {
  reactStrictMode: true,
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node"],
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("onnxruntime-node");
    }
    return config;
  },
};

export default nextConfig;
