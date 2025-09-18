# DeepStack Deployment Guide

## Overview

This guide covers deploying the poker room management system to production using Vercel for the frontend and Supabase for the backend.

## Prerequisites

- Vercel account
- Supabase account
- Domain name (optional)
- GitHub repository

## Environment Setup

### 1. Supabase Setup

#### Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and enter project details:
   - Name: `poker-room-management`
   - Database Password: Generate a strong password
   - Region: Choose closest to your users
4. Wait for project to be created

#### Configure Authentication

1. Go to Authentication > Settings
2. Configure Site URL: `https://your-domain.com` (or Vercel URL)
3. Add Redirect URLs:
   - `https://your-domain.com/auth/callback`
   - `http://localhost:3000/auth/callback` (for development)

#### Set up OAuth Providers

1. Go to Authentication > Providers
2. Enable desired providers (Google, GitHub, Discord)
3. Add OAuth credentials for each provider

#### Database Setup

1. Go to SQL Editor
2. Run the migration scripts from `docs/database.md`
3. Verify tables and RLS policies are created

### 2. Vercel Setup

#### Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure project settings:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

#### Environment Variables

Add the following environment variables in Vercel:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NextAuth (if using)
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-domain.com

# Optional: Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_analytics_id
```

## Deployment Process

### 1. Initial Deployment

#### Automatic Deployment

1. Push code to main branch
2. Vercel will automatically build and deploy
3. Check deployment logs for any errors

#### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 2. Database Migrations

#### Production Migrations

```bash
# Connect to production database
supabase db reset --linked

# Or run specific migrations
supabase db push
```

#### Migration Scripts

```sql
-- Run in Supabase SQL Editor
-- 001_initial_schema.sql
-- 002_add_features.sql
-- etc.
```

### 3. Domain Configuration

#### Custom Domain

1. Go to Vercel Project Settings > Domains
2. Add your custom domain
3. Configure DNS records:
   - A record: `@` → `76.76.19.61`
   - CNAME record: `www` → `cname.vercel-dns.com`

#### SSL Certificate

- Vercel automatically provides SSL certificates
- Certificates are automatically renewed

## Production Configuration

### 1. Next.js Configuration

#### Production Optimizations

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable compression
  compress: true,

  // Optimize images
  images: {
    domains: ['your-supabase-project.supabase.co'],
    formats: ['image/webp', 'image/avif'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },

  // Redirects
  async redirects() {
    return [
      // No redirects needed - admin routes are now /rooms/[room]/admin
    ]
  },
}

module.exports = nextConfig
```

### 2. Supabase Production Settings

#### Database Configuration

```sql
-- Enable connection pooling
ALTER SYSTEM SET max_connections = 200;

-- Configure shared_preload_libraries
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Restart database to apply changes
```

#### RLS Policies

Ensure all RLS policies are properly configured for production:

```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

### 3. Performance Optimization

#### Database Indexes

```sql
-- Add production indexes
CREATE INDEX CONCURRENTLY idx_users_tenant_active ON users(tenant_id, is_active);
CREATE INDEX CONCURRENTLY idx_games_tenant_active ON games(tenant_id, is_active);
CREATE INDEX CONCURRENTLY idx_tables_status_tenant ON tables(status, tenant_id);
```

#### Caching Strategy

```typescript
// lib/cache.ts
import { unstable_cache } from 'next/cache'

export const getCachedGames = unstable_cache(
  async (tenantId: string) => {
    // Fetch games from database
    return await GameService.getGames(tenantId)
  },
  ['games'],
  {
    revalidate: 60, // Cache for 1 minute
    tags: ['games'],
  }
)
```

## Monitoring & Analytics

### 1. Vercel Analytics

#### Enable Analytics

```bash
# Install Vercel Analytics
npm install @vercel/analytics

# Add to app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### 2. Error Monitoring

#### Sentry Integration

```bash
# Install Sentry
npm install @sentry/nextjs

# Configure sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
})
```

### 3. Database Monitoring

#### Supabase Monitoring

- Monitor database performance in Supabase Dashboard
- Set up alerts for high CPU usage
- Monitor connection counts
- Track slow queries

#### Custom Monitoring

```typescript
// lib/monitoring.ts
export async function logPerformance(operation: string, duration: number) {
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring service
    console.log(`Performance: ${operation} took ${duration}ms`)
  }
}
```

## Security Configuration

### 1. Environment Security

#### Secure Environment Variables

```bash
# Never commit these to version control
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret
```

#### API Rate Limiting

```typescript
// lib/rate-limit.ts
import { NextRequest } from 'next/server'

export function rateLimit(request: NextRequest) {
  // Implement rate limiting logic
  const ip = request.ip || 'unknown'
  // Check against rate limit store
  return { success: true, remaining: 100 }
}
```

### 2. Database Security

#### Connection Security

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
```

## Backup & Recovery

### 1. Database Backups

#### Automated Backups

- Supabase provides automatic daily backups
- Backups are retained for 7 days (Pro plan)
- Point-in-time recovery available

#### Manual Backups

```bash
# Create manual backup
pg_dump -h your-supabase-host -U postgres -d postgres > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -h your-supabase-host -U postgres -d postgres < backup_20240101.sql
```

### 2. Code Backups

#### Git Repository

- Ensure code is in version control
- Use feature branches for development
- Tag releases for easy rollback

#### Deployment Rollback

```bash
# Rollback to previous deployment
vercel rollback

# Or deploy specific commit
vercel --prod --force
```

## Scaling Considerations

### 1. Database Scaling

#### Connection Pooling

```typescript
// Use Supabase connection pooling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Connection pooling is handled automatically by Supabase
```

#### Read Replicas

- Consider read replicas for high-traffic applications
- Use read replicas for analytics queries
- Implement read/write splitting

### 2. Application Scaling

#### Vercel Scaling

- Vercel automatically scales based on traffic
- Edge functions for global distribution
- CDN for static assets

#### Caching Strategy

```typescript
// Implement Redis caching for frequently accessed data
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export async function getCachedData(key: string) {
  const cached = await redis.get(key)
  if (cached) return cached

  // Fetch from database and cache
  const data = await fetchFromDatabase()
  await redis.setex(key, 300, JSON.stringify(data)) // 5 minutes
  return data
}
```

## Troubleshooting

### 1. Common Issues

#### Build Failures

```bash
# Check build logs in Vercel dashboard
# Common fixes:
npm install
npm run build
```

#### Database Connection Issues

```typescript
// Check Supabase connection
const { data, error } = await supabase.from('users').select('count').limit(1)

if (error) {
  console.error('Database connection error:', error)
}
```

#### Authentication Issues

- Verify OAuth redirect URLs
- Check environment variables
- Ensure RLS policies are correct

### 2. Performance Issues

#### Slow Queries

```sql
-- Monitor slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

#### Memory Usage

- Monitor Vercel function memory usage
- Optimize bundle size
- Use dynamic imports for large components

### 3. Debugging

#### Production Debugging

```typescript
// Add debug logging
if (process.env.NODE_ENV === 'production') {
  console.log('Production debug info:', {
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    // ... other debug info
  })
}
```

#### Error Tracking

```typescript
// Implement error boundaries
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>
    }

    return this.props.children
  }
}
```

## Maintenance

### 1. Regular Updates

#### Dependency Updates

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Update major versions
npm install package@latest
```

#### Security Updates

- Monitor security advisories
- Update dependencies regularly
- Use `npm audit` to check for vulnerabilities

### 2. Performance Monitoring

#### Regular Health Checks

```typescript
// Implement health check endpoint
// app/api/health/route.ts
export async function GET() {
  try {
    // Check database connection
    const { data } = await supabase.from('users').select('count').limit(1)

    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    })
  } catch (error) {
    return Response.json(
      {
        status: 'unhealthy',
        error: error.message,
      },
      { status: 500 }
    )
  }
}
```

#### Performance Metrics

- Monitor Core Web Vitals
- Track API response times
- Monitor database performance
- Set up alerts for performance degradation
