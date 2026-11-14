/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Needed for fs module in API routes on Vercel
  serverExternalPackages: ['fs', 'path', 'os'],
  // Increase serverless function timeout for MCP sync (rate-limited)
  experimental: {},
};

module.exports = nextConfig;
