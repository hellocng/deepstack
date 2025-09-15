import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const host = request.headers.get('host') || ''
  const isDev =
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host.includes('0.0.0.0') ||
    (host.includes('.vercel.app') && host.includes('-dev')) ||
    process.env.NODE_ENV === 'development'

  // Development manifest
  const devManifest = {
    name: 'DeepStack [DEV]',
    short_name: 'DeepStack[DEV]',
    description:
      'Find poker games, join waitlists, and connect with friends - DEVELOPMENT',
    id: '/',
    start_url: '/',
    scope: '/',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    theme_color: '#000000',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
    categories: ['games', 'entertainment'],
    lang: 'en',
    dir: 'ltr',
    prefer_related_applications: false,
    related_applications: [],
    display_override: ['standalone', 'minimal-ui'],
  }

  // Production manifest
  const prodManifest = {
    name: 'DeepStack',
    short_name: 'DeepStack',
    description:
      'Find poker games, join waitlists, and connect with friends across multiple poker rooms.',
    id: '/',
    start_url: '/',
    scope: '/',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    theme_color: '#000000',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
    categories: ['games', 'entertainment'],
    lang: 'en',
    dir: 'ltr',
    prefer_related_applications: false,
    related_applications: [],
    display_override: ['standalone', 'minimal-ui'],
  }

  const manifest = isDev ? devManifest : prodManifest

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'no-cache',
    },
  })
}
