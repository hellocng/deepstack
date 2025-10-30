import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Operator } from '@/types'
import { createMiddlewareClient } from '@/lib/supabase/middleware-client'
import {
  createRoomResolver,
  ROOM_ID_HEADER,
  ROOM_SLUG_HEADER,
  UUID_REGEX,
} from '@/lib/rooms/context'

// Route classification helpers
const SUPERADMIN_SEGMENT = 'superadmin'

function isPublicRoute(pathname: string): boolean {
  return (
    pathname === '/signin' ||
    pathname === '/rooms' ||
    pathname === '/profile' ||
    pathname === '/superadmin/signin' ||
    pathname === '/admin' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/.well-known/')
  )
}

function isPlayerRoute(pathname: string): boolean {
  if (isPublicRoute(pathname)) return false
  // Player routes are /rooms/[room] (but not admin routes)
  return pathname.startsWith('/rooms/') && !pathname.startsWith('/admin/')
}

function getPathSegments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean)
}

function isAdminRoute(pathname: string): boolean {
  // Admin routes are /admin/[room]/...
  return pathname.startsWith('/admin/')
}

function isSuperAdminRoute(pathname: string): boolean {
  return pathname.startsWith(`/${SUPERADMIN_SEGMENT}`)
}

function isSigninRoute(pathname: string): boolean {
  return pathname.endsWith('/signin')
}

function extractRoomFromPath(pathname: string): string | null {
  // Extract room only from player routes: /rooms/[room]/...
  const segments = getPathSegments(pathname)
  if (segments.length >= 2 && segments[0] === 'rooms') return segments[1]
  return null
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const pathname = req.nextUrl.pathname

  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  const {
    supabase,
    response: _response,
    applyCookies,
  } = createMiddlewareClient(req)

  const roomResolver = createRoomResolver(supabase)
  const requestHeaders = new Headers(req.headers)
  const responseHeaders = new Map<string, string>()

  const roomParam = extractRoomFromPath(pathname)
  const roomContext = roomParam ? await roomResolver.resolve(roomParam) : null

  if (roomContext?.id) {
    requestHeaders.set(ROOM_ID_HEADER, roomContext.id)
  }

  if (roomContext?.code) {
    requestHeaders.set(ROOM_SLUG_HEADER, roomContext.code)
  }

  if (roomContext?.code && roomParam && roomParam !== roomContext.code) {
    const canonicalUrl = req.nextUrl.clone()
    // Canonicalize only /rooms/[room] URLs
    canonicalUrl.pathname = pathname.replace(
      `/rooms/${roomParam}`,
      `/rooms/${roomContext.code}`
    )
    return applyCookies(NextResponse.redirect(canonicalUrl))
  }

  const requestedRoomId =
    roomContext?.id ??
    (roomParam && UUID_REGEX.test(roomParam) ? roomParam : null)

  const resolveRoomPath = async (
    roomId: string | null | undefined,
    suffix = '/admin/'
  ): Promise<string> => {
    // For flat admin, return admin paths directly
    if (suffix.startsWith('/admin')) {
      return suffix
    }
    return roomResolver.buildRoomPath(roomId ?? undefined, suffix)
  }

  const finalize = (): NextResponse => {
    const next = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    responseHeaders.forEach((value, key) => {
      next.headers.set(key, value)
    })

    return applyCookies(next)
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) {
    // Root: unauthenticated users go to rooms
    if (pathname === '/') {
      return applyCookies(NextResponse.redirect(new URL('/rooms', req.url)))
    }
    if (isAdminRoute(pathname) && !isSigninRoute(pathname)) {
      const targetPath = await resolveRoomPath(
        requestedRoomId ?? roomParam,
        '/admin/signin'
      )
      return applyCookies(NextResponse.redirect(new URL(targetPath, req.url)))
    }

    if (isSuperAdminRoute(pathname) && !isSigninRoute(pathname)) {
      return applyCookies(
        NextResponse.redirect(new URL('/superadmin/signin', req.url))
      )
    }

    return finalize()
  }

  if (isAdminRoute(pathname)) {
    const { validation } = await roomResolver.validateAdminAccess(
      req,
      roomParam
    )

    if (validation && !validation.isAllowed) {
      const targetPath = await resolveRoomPath(
        requestedRoomId ?? roomParam,
        '/admin/signin'
      )

      console.warn(
        `IP restriction violation: ${validation.clientIP} attempted to access ${targetPath} - ${validation.reason}`
      )

      const errorUrl = new URL(targetPath, req.url)
      errorUrl.searchParams.set('error', 'ip_restricted')
      errorUrl.searchParams.set('ip', validation.clientIP)
      return applyCookies(NextResponse.redirect(errorUrl))
    }

    if (validation?.clientIP) {
      responseHeaders.set('x-client-ip', validation.clientIP)
    }
  }

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

  if (isSigninRoute(pathname)) {
    switch (userType) {
      case 'player':
        return applyCookies(NextResponse.redirect(new URL('/rooms', req.url)))
      case 'operator': {
        const room = operatorData?.room_id
        const adminUrl = '/admin'
        return applyCookies(NextResponse.redirect(new URL(adminUrl, req.url)))
      }
      case 'superadmin':
        return applyCookies(
          NextResponse.redirect(new URL('/superadmin/', req.url))
        )
    }
  }

  // Root: redirect logged-in users to their landing
  if (pathname === '/') {
    switch (userType) {
      case 'operator':
        return applyCookies(NextResponse.redirect(new URL('/admin', req.url)))
      case 'superadmin':
        return applyCookies(
          NextResponse.redirect(new URL('/superadmin/', req.url))
        )
      case 'player':
      default:
        return applyCookies(NextResponse.redirect(new URL('/rooms', req.url)))
    }
  }

  if (
    userType === 'player' &&
    (isAdminRoute(pathname) || isSuperAdminRoute(pathname))
  ) {
    return applyCookies(NextResponse.redirect(new URL('/rooms', req.url)))
  }

  if (userType === 'operator' && isSuperAdminRoute(pathname)) {
    if (operatorData?.role !== 'superadmin') {
      const room = operatorData?.room_id
      const adminUrl = room ? await resolveRoomPath(room) : '/'
      return applyCookies(NextResponse.redirect(new URL(adminUrl, req.url)))
    }
  }

  if (isPlayerRoute(pathname) || isAdminRoute(pathname)) {
    if (roomParam) {
      if (!roomContext) {
        switch (userType) {
          case 'player':
            return applyCookies(
              NextResponse.redirect(new URL('/rooms', req.url))
            )
          case 'operator': {
            const operatorRoom = operatorData?.room_id
            const adminUrl = operatorRoom
              ? await resolveRoomPath(operatorRoom)
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

      // With flat admin, we don't compare operator room to URL room
    }
  }

  if (operatorData) {
    responseHeaders.set('x-operator-id', operatorData.id)
    responseHeaders.set('x-operator-role', operatorData.role)
    responseHeaders.set('x-operator-room-id', operatorData.room_id || '')
  }

  return finalize()
}

export const config = {
  matcher: [
    /*
     * Match all routes except static files, API routes, and Next.js internals
     */
    '/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|offline.html|sw.js|api|.*\\.png|.*\\.svg|.*\\.ico|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp).*)',
  ],
}
