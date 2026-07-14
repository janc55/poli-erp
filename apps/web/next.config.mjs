/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@poli-erp/shared'],
};

export default nextConfig;
