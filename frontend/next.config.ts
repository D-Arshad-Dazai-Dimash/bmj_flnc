import type { NextConfig } from 'next'
import withBundleAnalyzer from '@next/bundle-analyzer'

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const apiUrl = process.env.NEXT_PUBLIC_API_URL
let apiRemotePattern:
  | {
      protocol: 'http' | 'https'
      hostname: string
      port: string
      pathname: string
    }
  | null = null

if (apiUrl) {
  try {
    const parsed = new URL(apiUrl)
    apiRemotePattern = {
      protocol: parsed.protocol.replace(':', '') as 'http' | 'https',
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: '/**',
    }
  } catch {
    apiRemotePattern = null
  }
}

const nextConfig: NextConfig = {
  // ── Faster builds & smaller bundles ─────────────────────────
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '172.20.10.2',
        port: '5000',
        pathname: '/**',
      },
      ...(apiRemotePattern ? [apiRemotePattern] : []),
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },

  // ── Bundle optimizations ────────────────────────────────────
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@supabase/supabase-js',
    ],
  },
}

export default withAnalyzer(nextConfig)
