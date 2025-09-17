# DeepStack Authentication & Authorization Guide

## Overview

The poker room management system uses a simplified authentication architecture that supports three types of users:

- **Registered Players**: Phone-based authentication using Supabase Auth with full app access
- **Anonymous/Call-in Players**: No authentication required, stored in same players table with `auth_id=NULL`
- **Operators**: Email/password authentication with tenant-specific roles

**Key Simplification**: Both registered and anonymous players use the same `players` table. The distinction is simple:

- **Registered Players**: `auth_id` is NOT NULL (has Supabase Auth entry)
- **Anonymous Players**: `auth_id` is NULL (no Supabase Auth entry)
- **Active Status**: Determined by session, not database field

The system supports multiple tenants with proper data isolation and role-based access control.

### 2024-05 Updates

- Client auth always verifies the current user with `supabase.auth.getUser()` (never trust the
  session payload alone). The shared `UserProvider` applies this pattern, guards against concurrent
  syncs, and refreshes the profile after sign-in flows. Check `lib/auth/user-context.tsx` for the
  reference implementation.
- Player phone sign-in now refreshes the user context and redirects to `/rooms` so the navigation
  avatar and alias populate immediately without a manual reload.
- Operator/admin sign-in keeps the submit button disabled until navigation completes, waits for a
  `refreshUser()` call, and then routes to the tenant dashboard.
- The navigation avatar popover shows:
  - **Players**: alias + formatted phone number caption
  - **Operators**: room name + role caption
  - **Super Admins**: "Super Admin" label + verified email from `authUser`

## Authentication Flow

### 1. Registered Player Authentication (Phone-based)

```typescript
// lib/auth/player-auth.ts
import { supabase } from '@/lib/supabase/client'

export class PlayerAuthService {
  // Send OTP to phone number
  static async sendOTP(phoneNumber: string) {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
      options: {
        channel: 'sms',
      },
    })

    if (error) throw error
    return data
  }

  // Verify OTP and sign in
  static async verifyOTP(phoneNumber: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token,
      type: 'sms',
    })

    if (error) throw error
    return data
  }

  // Sign out
  static async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Get current player
  static async getCurrentPlayer() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) throw error
    return user
  }
}
```

### 2. Anonymous/Call-in Player Management (No Authentication)

```typescript
// lib/auth/player-service.ts (updated to handle both types)
import { supabase } from '@/lib/supabase/client'

export class PlayerService {
  // Create anonymous player for call-in (NO Supabase Auth entry created)
  static async createAnonymousPlayer(alias: string, phoneNumber?: string) {
    const { data, error } = await supabase
      .from('players')
      .insert({
        alias,
        phone_number: phoneNumber, // Optional - some players won't provide
        auth_id: null, // NULL = anonymous player
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Create registered player (with Supabase Auth entry)
  static async createRegisteredPlayer(
    user: any, // From Supabase Auth
    alias: string,
    email?: string
  ) {
    const { data, error } = await supabase
      .from('players')
      .insert({
        id: user.id, // Use auth user ID
        phone_number: user.phone, // Optional - may be null
        alias,
        email,
        avatar_url: user.user_metadata?.avatar_url,
        auth_id: user.id, // NOT NULL = registered player
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Get player by ID (works for both types)
  static async getPlayer(playerId: string) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()

    if (error) throw error
    return data
  }

  // Get anonymous players
  static async getAnonymousPlayers() {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .is('auth_id', null) // NULL auth_id = anonymous player
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // Link anonymous player to registered account (creates Supabase Auth entry)
  static async linkAnonymousToRegistered(
    anonymousPlayerId: string,
    registeredPlayerId: string
  ) {
    const { data, error } = await supabase
      .from('players')
      .update({
        auth_id: registeredPlayerId, // Set auth_id to convert to registered player
        // Note: This assumes the registeredPlayerId is a valid auth.users.id
        // The actual Supabase Auth user creation should happen before this call
      })
      .eq('id', anonymousPlayerId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}
```

### 3. Operator Authentication (Email/Password via Supabase Auth)

```typescript
// lib/auth/operator-auth.ts
import { supabase } from '@/lib/supabase/client'

export class OperatorAuthService {
  // Sign in with email and password
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }

  // Sign up new operator (admin only)
  static async signUp(
    email: string,
    password: string,
    userData: {
      first_name: string
      last_name: string
      phone_number?: string
      tenant_id: string
      role: 'admin' | 'supervisor' | 'dealer'
    }
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    })

    if (error) throw error
    return data
  }

  // Sign out
  static async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Get current operator
  static async getCurrentOperator() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) throw error
    return user
  }
}
```

### 4. OAuth Callback Handling

```typescript
// app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const tenantCode = requestUrl.searchParams.get('tenant')

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
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
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to tenant page or home
  const redirectUrl = tenantCode ? `/${tenantCode}` : '/'
  return NextResponse.redirect(redirectUrl)
}
```

## User Management

### Player Profile Management (Both Types)

```typescript
// lib/auth/player-service.ts
import { supabase } from '@/lib/supabase/client'

export class PlayerService {
  // Create player profile after phone authentication
  static async createPlayerProfile(user: any, alias: string, email?: string) {
    const { data, error } = await supabase
      .from('players')
      .insert({
        id: user.id,
        phone_number: user.phone,
        alias: alias,
        email: email,
        avatar_url: user.user_metadata?.avatar_url,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Get player profile
  static async getPlayerProfile(playerId: string) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()

    if (error) throw error
    return data
  }

  // Update player profile
  static async updatePlayerProfile(playerId: string, updates: any) {
    const { data, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', playerId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}
```

### Operator Management

```typescript
// lib/auth/operator-service.ts
import { supabase } from '@/lib/supabase/client'

export class OperatorService {
  // Create operator account (admin only)
  static async createOperator(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    tenantId: string,
    role: 'admin' | 'supervisor' | 'dealer',
    phoneNumber?: string
  ) {
    // First, create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          tenant_id: tenantId,
          role,
        },
      },
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Failed to create user')

    // Then create the operator profile
    const { data, error } = await supabase
      .from('operators')
      .insert({
        auth_id: authData.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        tenant_id: tenantId,
        role,
      })
      .select(
        `
        *,
        tenant:tenants(*)
      `
      )
      .single()

    if (error) throw error
    return data
  }

  // Get operator profile by auth ID
  static async getOperatorProfile(authId: string) {
    const { data, error } = await supabase
      .from('operators')
      .select(
        `
        *,
        tenant:tenants(*)
      `
      )
      .eq('auth_id', authId)
      .single()

    if (error) throw error
    return data
  }

  // Get operator profile by operator ID
  static async getOperatorById(operatorId: string) {
    const { data, error } = await supabase
      .from('operators')
      .select(
        `
        *,
        tenant:tenants(*)
      `
      )
      .eq('id', operatorId)
      .single()

    if (error) throw error
    return data
  }

  // Update operator profile
  static async updateOperatorProfile(authId: string, updates: any) {
    const { data, error } = await supabase
      .from('operators')
      .update(updates)
      .eq('auth_id', authId)
      .select(
        `
        *,
        tenant:tenants(*)
      `
      )
      .single()

    if (error) throw error
    return data
  }

  // Update operator password
  static async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) throw error
  }

  // Get all operators for a tenant (admin only)
  static async getTenantOperators(tenantId: string) {
    const { data, error } = await supabase
      .from('operators')
      .select(
        `
        *,
        tenant:tenants(*)
      `
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }
}
```

## Role-Based Access Control

### User Types

```typescript
// types/auth.ts
export type OperatorRole = 'admin' | 'supervisor' | 'dealer'

export interface Player {
  id: string
  phone_number?: string // Optional for all players
  alias: string
  avatar_url?: string
  email?: string
  auth_id?: string // NULL = anonymous, NOT NULL = registered
  last_login?: string
  created_at: string
  updated_at: string
}

export interface Operator {
  id: string
  auth_id: string
  email: string
  first_name: string
  last_name: string
  phone_number?: string
  avatar_url?: string
  tenant_id: string
  role: OperatorRole
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
  tenant: {
    id: string
    name: string
    code: string
  }
}
```

### Permission System

```typescript
// lib/auth/permissions.ts
export class Permissions {
  // Check if registered player can access tenant (players can access any tenant)
  static canPlayerAccessTenant(player: Player): boolean {
    return player.auth_id !== null // Has auth_id = registered player
  }

  // Check if anonymous player can be managed by operators
  static canManageAnonymousPlayer(operator: Operator): boolean {
    return true // Operators can manage anonymous players in their tenant
  }

  // Check if operator can access their tenant
  static canOperatorAccessTenant(
    operator: Operator,
    tenantCode: string
  ): boolean {
    return operator.tenant.code === tenantCode // Active status determined by session
  }

  // Check if operator can manage games
  static canManageGames(operator: Operator): boolean {
    return ['admin', 'supervisor'].includes(operator.role)
  }

  // Check if operator can manage tables
  static canManageTables(operator: Operator): boolean {
    return ['admin', 'supervisor', 'dealer'].includes(operator.role)
  }

  // Check if operator can manage tournaments
  static canManageTournaments(operator: Operator): boolean {
    return ['admin', 'supervisor'].includes(operator.role)
  }

  // Check if operator can manage other operators
  static canManageOperators(operator: Operator): boolean {
    return operator.role === 'admin'
  }

  // Check if operator can access admin panel
  static canAccessAdmin(operator: Operator): boolean {
    return ['admin', 'supervisor', 'dealer'].includes(operator.role)
  }

  // Check if registered player can join waitlist
  static canJoinWaitlist(player: Player): boolean {
    return player.auth_id !== null // Has auth_id = registered player
  }

  // Check if registered player can register for tournaments
  static canRegisterTournament(player: Player): boolean {
    return player.auth_id !== null // Has auth_id = registered player
  }

  // Check if anonymous player can be added to waitlist (operators only)
  static canAddAnonymousToWaitlist(operator: Operator): boolean {
    return true // Operators can add anonymous players to waitlist
  }
}
```

## Middleware Protection

### Route Protection Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Extract tenant and route info
  const pathname = request.nextUrl.pathname
  const pathSegments = pathname.split('/').filter(Boolean)
  const tenant = pathSegments[0]
  const isAdminRoute = pathSegments[1] === 'admin'
  const isApiRoute = pathSegments[0] === 'api'

  // Skip auth for public routes
  if (isPublicRoute(pathname)) {
    return res
  }

  // Validate tenant exists
  if (tenant && !isApiRoute) {
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id, code')
      .eq('code', tenant)
      .eq('is_active', true)
      .single()

    if (!tenantData) {
      return NextResponse.redirect(new URL('/404', request.url))
    }
  }

  // Protect authenticated routes
  if (requiresAuth(pathname) && !session) {
    const redirectUrl = tenant ? `/${tenant}/login` : '/login'
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }

  // Protect admin routes (operators only)
  if (isAdminRoute && session) {
    const { data: operator } = await supabase
      .from('operators')
      .select('role, tenant_id')
      .eq('auth_id', session.user.id)
      .single()

    if (
      !operator ||
      operator.tenant_id !== tenant ||
      !['admin', 'supervisor', 'dealer'].includes(operator.role)
    ) {
      return NextResponse.redirect(new URL(`/${tenant}`, request.url))
    }
  }

  return res
}

function isPublicRoute(pathname: string): boolean {
  const publicRoutes = ['/', '/login', '/signup', '/auth/callback']
  return publicRoutes.includes(pathname) || pathname.startsWith('/_next')
}

function requiresAuth(pathname: string): boolean {
  const protectedRoutes = ['/profile', '/admin', '/api']
  return protectedRoutes.some((route) => pathname.includes(route))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

## Authentication Hooks

### React Hooks for Player Auth

```typescript
// lib/auth/use-player-auth.ts
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { PlayerService } from './player-service'
import type { Player } from '@/types/auth'

interface PlayerAuthContextType {
  player: Player | null
  loading: boolean
  sendOTP: (phoneNumber: string) => Promise<void>
  verifyOTP: (phoneNumber: string, token: string) => Promise<void>
  signOut: () => Promise<void>
}

const PlayerAuthContext = createContext<PlayerAuthContextType | undefined>(undefined)

export function PlayerAuthProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        try {
          const playerProfile = await PlayerService.getPlayerProfile(session.user.id)
          setPlayer(playerProfile)
        } catch (error) {
          console.error('Error loading player profile:', error)
        }
      }

      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          try {
            const playerProfile = await PlayerService.getPlayerProfile(session.user.id)
            setPlayer(playerProfile)
          } catch (error) {
            console.error('Error loading player profile:', error)
            setPlayer(null)
          }
        } else {
          setPlayer(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const sendOTP = async (phoneNumber: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
      options: {
        channel: 'sms'
      }
    })
    if (error) throw error
  }

  const verifyOTP = async (phoneNumber: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token,
      type: 'sms'
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <PlayerAuthContext.Provider value={{
      player,
      loading,
      sendOTP,
      verifyOTP,
      signOut
    }}>
      {children}
    </PlayerAuthContext.Provider>
  )
}

export function usePlayerAuth() {
  const context = useContext(PlayerAuthContext)
  if (context === undefined) {
    throw new Error('usePlayerAuth must be used within a PlayerAuthProvider')
  }
  return context
}
```

### React Hooks for Operator Auth

```typescript
// lib/auth/use-operator-auth.ts
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { OperatorService } from './operator-service'
import type { Operator } from '@/types/auth'

interface OperatorAuthContextType {
  operator: Operator | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const OperatorAuthContext = createContext<OperatorAuthContextType | undefined>(undefined)

export function OperatorAuthProvider({ children }: { children: React.ReactNode }) {
  const [operator, setOperator] = useState<Operator | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        try {
          const operatorProfile = await OperatorService.getOperatorProfile(session.user.id)
          setOperator(operatorProfile)
        } catch (error) {
          console.error('Error loading operator profile:', error)
        }
      }

      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          try {
            const operatorProfile = await OperatorService.getOperatorProfile(session.user.id)
            setOperator(operatorProfile)
          } catch (error) {
            console.error('Error loading operator profile:', error)
            setOperator(null)
          }
        } else {
          setOperator(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <OperatorAuthContext.Provider value={{
      operator,
      loading,
      signIn,
      signOut
    }}>
      {children}
    </OperatorAuthContext.Provider>
  )
}

export function useOperatorAuth() {
  const context = useContext(OperatorAuthContext)
  if (context === undefined) {
    throw new Error('useOperatorAuth must be used within an OperatorAuthProvider')
  }
  return context
}
```

## API Route Protection

### Server-Side Auth

```typescript
// lib/auth/server-auth.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function getServerUser(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  return user
}

export async function requireTenantAccess(
  request: NextRequest,
  tenantCode: string
) {
  const user = await getServerUser(request)
  const supabase = createRouteHandlerClient({ cookies })

  const { data: userData } = await supabase
    .from('operators')
    .select('tenant_id, role')
    .eq('auth_id', user.id)
    .single()

  if (!userData || userData.tenant_id !== tenantCode) {
    throw new Error('Access denied')
  }

  return { user, userData }
}

export async function requireAdminAccess(
  request: NextRequest,
  tenantCode: string
) {
  const { user, userData } = await requireTenantAccess(request, tenantCode)

  if (!['operator', 'admin'].includes(userData.role)) {
    throw new Error('Admin access required')
  }

  return { user, userData }
}
```

## OAuth Configuration

### Supabase OAuth Setup

1. **Google OAuth:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `https://your-project.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (for development)

2. **GitHub OAuth:**
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create new OAuth App
   - Set Authorization callback URL:
     - `https://your-project.supabase.co/auth/v1/callback`

3. **Discord OAuth:**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create new application
   - Add redirect URI:
     - `https://your-project.supabase.co/auth/v1/callback`

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OAuth (configured in Supabase dashboard)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
```

## Security Best Practices

### Password Requirements

```typescript
// lib/auth/password-validation.ts
export function validatePassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
```

### Session Management

```typescript
// lib/auth/session-config.ts
export const sessionConfig = {
  // Session duration (in seconds)
  maxAge: 7 * 24 * 60 * 60, // 7 days

  // Refresh token rotation
  refreshTokenRotation: true,

  // Secure cookie settings
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  httpOnly: true,
}
```

### Rate Limiting

```typescript
// lib/auth/rate-limit.ts
import { NextRequest } from 'next/server'

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()

export function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 5

  const attempts = loginAttempts.get(ip)

  if (!attempts) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now })
    return true
  }

  // Reset if window has passed
  if (now - attempts.lastAttempt > windowMs) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now })
    return true
  }

  // Check if limit exceeded
  if (attempts.count >= maxAttempts) {
    return false
  }

  attempts.count++
  attempts.lastAttempt = now
  return true
}
```

## Testing Authentication

### Test Utilities

```typescript
// __tests__/utils/auth-test-utils.ts
import { createClient } from '@supabase/supabase-js'

export async function createTestUser(email: string, password: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) throw error
  return data.user
}

export async function deleteTestUser(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase.auth.admin.deleteUser(userId)
}
```

### Authentication Tests

```typescript
// __tests__/auth/auth.test.ts
import { AuthService } from '@/lib/auth/auth-service'
import { createTestUser, deleteTestUser } from '../utils/auth-test-utils'

describe('Authentication', () => {
  let testUser: any

  beforeEach(async () => {
    testUser = await createTestUser('test@example.com', 'password123')
  })

  afterEach(async () => {
    if (testUser) {
      await deleteTestUser(testUser.id)
    }
  })

  it('should sign in with valid credentials', async () => {
    const result = await AuthService.signIn('test@example.com', 'password123')
    expect(result.user).toBeDefined()
  })

  it('should reject invalid credentials', async () => {
    await expect(
      AuthService.signIn('test@example.com', 'wrongpassword')
    ).rejects.toThrow()
  })
})
```
