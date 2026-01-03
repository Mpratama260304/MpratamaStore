/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      allowedOrigins: [
        'localhost:3000',
        '*.app.github.dev',
        '*.github.dev',
        '*.preview.app.github.dev',
      ],
    },
  },
  // Disable static generation for pages that require database at build time
  // All pages will be rendered dynamically at runtime
  // This is necessary for Docker builds without database access
  ...(process.env.SKIP_ENV_VALIDATION && {
    // During Docker build, skip generating static pages
    generateBuildId: async () => 'docker-build',
  }),
}

module.exports = nextConfig
