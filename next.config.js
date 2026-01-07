/** @type {import('next').NextConfig} */
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "/inspecta";
const basePath =
  rawBasePath && rawBasePath !== "/" ? rawBasePath.replace(/\/$/, "") : "";

const nextConfig = {
  reactStrictMode: true,
  basePath,
  trailingSlash: true,
};

export default nextConfig;
