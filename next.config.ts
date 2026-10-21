import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  reactStrictMode: true,
  experimental: {
    // Phosphor ships a module per icon; only load the ones we import (mostly a dev-compile win).
    optimizePackageImports: ['@phosphor-icons/react'],
  },
}

export default nextConfig
