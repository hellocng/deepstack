import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Operator } from '@/types'
import { createMiddlewareClient } from '@/lib/supabase/middleware-client'
import { validateIPAccess } from '@/lib/ip-validation'

// Route classification helpers
const SUPERADMIN_SEGMENT = 'superadmin'

function isPublicRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/signin' ||
    pathname === '/rooms' ||
    pathname === '/profile' ||
    pathname === '/superadmin/signin' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/.well-known/')
  )
}

function isPlayerRoute(pathname: string): boolean {
  if (isPublicRoute(pathname)) return false
  // Player routes are now /rooms/[room] (but not admin routes)
  return pathname.startsWith('/rooms/') && !pathname.includes('/admin')
}

function getPathSegments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean)
}

function isAdminRoute(pathname: string): boolean {
  // Admin routes are now /rooms/[room]/admin
  return pathname.startsWith('/rooms/') && pathname.includes('/admin')
}

function isSuperAdminRoute(pathname: string): boolean {
  return pathname.startsWith(`/${SUPERADMIN_SEGMENT}`)
}

function isSigninRoute(pathname: string): boolean {
  return pathname.endsWith('/signin')
}

function extractRoomFromPath(pathname: string): string | null {
  // Extract room from /rooms/[room] or /rooms/[room]/admin paths
  if (pathname.startsWith('/rooms/')) {
    const segments = getPathSegments(pathname)
    if (segments.length >= 2 && segments[0] === 'rooms') {
      return segments[1]
    }
  }
  return null
}

async function validateRoomExists(
  roomCode: string,
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('rooms')
      .select('id')
      .eq('code', roomCode)
      .eq('is_active', true)
      .single()

    return !!data
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const pathname = req.nextUrl.pathname

  // Skip middleware for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  const { supabase, response, applyCookies } = createMiddlewareClient(req)
  const result = response

  // Refresh the session and fetch the current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // Handle unauthenticated users
  if (!user || authError) {
    if (isAdminRoute(pathname) && !isSigninRoute(pathname)) {
      const room = extractRoomFromPath(pathname)
      if (room) {
        const signinUrl = new URL(`/rooms/${room}/admin/signin`, req.url)
        signinUrl.searchParams.set('redirect', pathname)
        return applyCookies(NextResponse.redirect(signinUrl))
      }
    }

    if (isSuperAdminRoute(pathname) && !isSigninRoute(pathname)) {
      return applyCookies(
        NextResponse.redirect(new URL('/superadmin/signin', req.url))
      )
    }

    // Allow player routes and signin pages for unauthenticated users
    return applyCookies(result)
  }

  // IP validation for admin routes (before authentication check)
  if (isAdminRoute(pathname)) {
    const room = extractRoomFromPath(pathname)
    if (room) {
      const ipValidation = await validateIPAccess(req, room, supabase)

      if (!ipValidation.isAllowed) {
        // Log the attempt for security monitoring
        console.warn(
          `IP restriction violation: ${ipValidation.clientIP} attempted to access ${room}/admin - ${ipValidation.reason}`
        )

        // Redirect to signin with error message
        const errorUrl = new URL(`/rooms/${room}/admin/signin`, req.url)
        errorUrl.searchParams.set('error', 'ip_restricted')
        errorUrl.searchParams.set('ip', ipValidation.clientIP)
        return applyCookies(NextResponse.redirect(errorUrl))
      }

      // Add IP info to headers for logging/monitoring
      result.headers.set('x-client-ip', ipValidation.clientIP)
    }
  }

  // Handle authenticated users - determine user type
  let userType: 'player' | 'operator' | 'superadmin' | null = null
  let operatorData: Pick<Operator, 'id' | 'role' | 'room_id'> | null = null

  try {
    const { data: operator, error: operatorError } = await supabase
      .from('operators')
      .select('id, role, room_id')
      .eq('auth_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (operatorError && operatorError.code !== 'PGRST116') {
      throw operatorError
    }

    if (operator) {
      userType = operator.role === 'superadmin' ? 'superadmin' : 'operator'
      operatorData = operator
    } else {
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle()

      if (playerError && playerError.code !== 'PGRST116') {
        throw playerError
      }

      if (player) {
        userType = 'player'
      }
    }
  } catch (_error) {
    return applyCookies(NextResponse.redirect(new URL('/', req.url)))
  }

  // Handle signin page redirects for authenticated users
  if (isSigninRoute(pathname)) {
    switch (userType) {
      case 'player':
        return applyCookies(NextResponse.redirect(new URL('/rooms', req.url)))
      case 'operator': {
        const room = operatorData?.room_id
        const adminUrl = room ? `/rooms/${room}/admin/` : '/'
        return applyCookies(NextResponse.redirect(new URL(adminUrl, req.url)))
      }
      case 'superadmin':
        return applyCookies(
          NextResponse.redirect(new URL('/superadmin/', req.url))
        )
    }
  }

  // Access control for authenticated users
  if (
    userType === 'player' &&
    (isAdminRoute(pathname) || isSuperAdminRoute(pathname))
  ) {
    return applyCookies(NextResponse.redirect(new URL('/rooms', req.url)))
  }

  if (userType === 'operator' && isSuperAdminRoute(pathname)) {
    // Operator accessing superadmin route - no logging needed
    if (operatorData?.role !== 'superadmin') {
      const room = operatorData?.room_id
      const adminUrl = room ? `/rooms/${room}/admin/` : '/'
      return applyCookies(NextResponse.redirect(new URL(adminUrl, req.url)))
    }
  }

  // Validate room exists and user has access for room-specific routes
  if (isPlayerRoute(pathname) || isAdminRoute(pathname)) {
    const room = extractRoomFromPath(pathname)
    if (room) {
      const roomExists = await validateRoomExists(room, supabase)

      if (!roomExists) {
        // Room doesn't exist - redirect based on user type
        switch (userType) {
          case 'player':
            return applyCookies(
              NextResponse.redirect(new URL('/rooms', req.url))
            )
          case 'operator': {
            const operatorRoom = operatorData?.room_id
            const adminUrl = operatorRoom
              ? `/rooms/${operatorRoom}/admin/`
              : '/rooms'
            return applyCookies(
              NextResponse.redirect(new URL(adminUrl, req.url))
            )
          }
          case 'superadmin':
            return applyCookies(
              NextResponse.redirect(new URL('/superadmin/', req.url))
            )
          default:
            return applyCookies(
              NextResponse.redirect(new URL('/rooms', req.url))
            )
        }
      }

      // Room exists - check operator access for admin routes
      if (
        isAdminRoute(pathname) &&
        userType === 'operator' &&
        operatorData?.room_id !== room
      ) {
        // Operator trying to access a different room's admin
        const operatorRoom = operatorData?.room_id
        const adminUrl = operatorRoom
          ? `/rooms/${operatorRoom}/admin/`
          : '/rooms'
        return applyCookies(NextResponse.redirect(new URL(adminUrl, req.url)))
      }
    }
  }

  // Set operator info in headers for use in the app
  if (operatorData) {
    result.headers.set('x-operator-id', operatorData.id)
    result.headers.set('x-operator-role', operatorData.role)
    result.headers.set('x-operator-room-id', operatorData.room_id || '')
  }

  return applyCookies(result)
}

export const config = {
  matcher: [
    /*
     * Match all routes except static files, API routes, and Next.js internals
     */
    '/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|offline.html|sw.js|api|.*\\.png|.*\\.svg|.*\\.ico|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp).*)',
  ],
}
