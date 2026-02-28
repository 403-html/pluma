import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@pluma/types'],
  async rewrites() {
    if (typeof process.env.API_URL !== 'string' || process.env.API_URL.length === 0) {
      throw new Error('API_URL environment variable is required and cannot be empty');
    }
    const apiUrl = process.env.API_URL.trim();
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
      {
        source: '/sdk/v1/:path*',
        destination: `${apiUrl}/sdk/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
