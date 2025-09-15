import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Get the current session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // Check if this is a superadmin route
  const isSuperAdminRoute = req.nextUrl.pathname.startsWith('/superadmin')
  const isSuperAdminSignIn = req.nextUrl.pathname === '/superadmin/signin'

  if (isSuperAdminRoute && !isSuperAdminSignIn) {
    // Check if user is a superadmin
    let isSuperAdmin = false

    if (user && !authError) {
      const { data: operator, error: _error } = await supabase
        .from('operators')
        .select('role')
        .eq('auth_id', user.id)
        .eq('role', 'superadmin')
        .eq('is_active', true)
        .single()

      isSuperAdmin = !!operator
    }

    // If user is not a superadmin, redirect to superadmin sign-in
    if (!isSuperAdmin) {
      return NextResponse.redirect(new URL('/superadmin/signin', req.url))
    }
  } else {
    // This is an admin route (not superadmin)
    // If no user, redirect to admin sign-in
    if (!user || authError) {
      const adminSignInUrl = new URL('/admin/signin', req.url)
      adminSignInUrl.searchParams.set('redirect', req.nextUrl.pathname)
      return NextResponse.redirect(adminSignInUrl)
    }

    // Check if the user is an operator (not a player)
    if (user) {
      try {
        const { data: operator, error } = await supabase
          .from('operators')
          .select('id, role, room_id')
          .eq('auth_id', user.id)
          .single()

        // If user is not an operator (i.e., they're a player), redirect to root
        if (error || !operator) {
          return NextResponse.redirect(new URL('/', req.url))
        }

        // Add operator info to headers for use in the app
        res.headers.set('x-operator-id', operator.id)
        res.headers.set('x-operator-role', operator.role)
        res.headers.set('x-operator-room-id', operator.room_id)
      } catch (_error) {
        // If there's an error checking operator status, redirect to root
        return NextResponse.redirect(new URL('/', req.url))
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match admin routes except for sign-in page
     */
    '/(room)/admin/((?!signin).)*',
    '/admin/((?!signin).)*',
    /*
     * Match superadmin routes except for sign-in page
     */
    '/superadmin/((?!signin).)*',
  ],
}
