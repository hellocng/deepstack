import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Operator } from '@/types'
import { createMiddlewareClient } from '@/lib/supabase/middleware-client'

// Route classification helpers
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
  const segments = pathname.split('/').filter(Boolean)
  return (
    segments.length >= 1 &&
    !segments.includes('admin') &&
    !segments.includes('superadmin') &&
    !isPublicRoute(pathname)
  )
}

function isAdminRoute(pathname: string): boolean {
  return pathname.includes('/admin/')
}

function isSuperAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/superadmin')
}

function isSigninRoute(pathname: string): boolean {
  return pathname.endsWith('/signin')
}

function extractRoomFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean)
  // For routes like /[room]/admin/*, the room is the first segment
  if (segments.length >= 2 && segments[1] === 'admin') {
    return segments[0]
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
        const signinUrl = new URL(`/${room}/admin/signin`, req.url)
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

  // Handle authenticated users - determine user type
  let userType: 'player' | 'operator' | 'superadmin' | null = null
  let operatorData: Pick<Operator, 'id' | 'role' | 'room_id'> | null = null

  try {
    // Check if user is a superadmin
    const { data: superAdmin } = await supabase
      .from('operators')
      .select('id, role, room_id')
      .eq('auth_id', user.id)
      .eq('role', 'superadmin')
      .eq('is_active', true)
      .single()

    if (superAdmin) {
      userType = 'superadmin'
      operatorData = superAdmin
      // Superadmin detected - no logging needed
    } else {
      // Check if user is an operator (admin/supervisor/dealer)
      const { data: operator } = await supabase
        .from('operators')
        .select('id, role, room_id')
        .eq('auth_id', user.id)
        .eq('is_active', true)
        .single()

      if (operator) {
        userType = 'operator'
        operatorData = operator
      } else {
        // Check if user is a player
        const { data: player } = await supabase
          .from('players')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (player) {
          userType = 'player'
        }
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
        const adminUrl = room ? `/${room}/admin/` : '/'
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
      const adminUrl = room ? `/${room}/admin/` : '/'
      return applyCookies(NextResponse.redirect(new URL(adminUrl, req.url)))
    }
  }

  // Validate room exists for room-specific routes
  if (isPlayerRoute(pathname) || isAdminRoute(pathname)) {
    const room = extractRoomFromPath(pathname) || pathname.split('/')[1]
    if (room && !(await validateRoomExists(room, supabase))) {
      return applyCookies(NextResponse.redirect(new URL('/rooms', req.url)))
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
