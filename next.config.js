/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow the data directory to be written at runtime (for local JSON store)
  serverExternalPackages: [],
};

module.exports = nextConfig;
