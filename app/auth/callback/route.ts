import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token = requestUrl.searchParams.get('token')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    // OAuth flow - exchange code for session
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
       
      console.error('Auth callback error:', error)
      return NextResponse.redirect(
        new URL('/signin?error=auth_callback_failed', request.url)
      )
    }
  }

  if (token && type) {
    // Email confirmation or password reset
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as 'signup' | 'recovery' | 'email_change',
    })

    if (error) {
       
      console.error('Token verification error:', error)
      return NextResponse.redirect(
        new URL('/signin?error=verification_failed', request.url)
      )
    }
  }

  // Success - redirect to intended destination
  return NextResponse.redirect(new URL(next, request.url))
}
