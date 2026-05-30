import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Only allow mobile dev testing in development mode
  ...(process.env.NODE_ENV !== 'production' && {
    allowedDevOrigins: ['192.168.1.4'],
  }),

  // Supabase Storage image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 100],
  },

  // Production HTTP headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // Auth-scoped API responses must never be shared or persisted by proxies/browsers.
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' }],
      },
    ];
  },

  // Compress output for faster delivery
  compress: true,

  // Optimize packages with server components
  serverExternalPackages: ['@prisma/client', 'pg'],
};

export default nextConfig;
