import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    if (typeof process.env.NEXT_PUBLIC_API_URL !== 'string' || process.env.NEXT_PUBLIC_API_URL.length === 0) {
      throw new Error('NEXT_PUBLIC_API_URL environment variable is required and cannot be empty');
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL.trim();
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
