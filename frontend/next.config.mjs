/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Allow dynamic routes with fallback
  generateBuildId: () => 'build',
  // Skip trailing slash for dynamic routes
  skipTrailingSlashRedirect: true,
  // Asset prefix for custom domain (temporarily disabled)
  // assetPrefix: process.env.NODE_ENV === 'production' ? 'https://icp.dpolls.ai' : '',
  // Remove server-side features for static export
  // experimental: {
  //   serverActions: {
  //     bodySizeLimit: '2mb',
  //   },
  // },
};

export default nextConfig;
