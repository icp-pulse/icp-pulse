/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Remove server-side features for static export
  // experimental: {
  //   serverActions: {
  //     bodySizeLimit: '2mb',
  //   },
  // },
};

export default nextConfig;
