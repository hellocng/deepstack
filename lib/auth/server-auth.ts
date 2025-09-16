import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Tables } from '@/types/supabase'
import { PlayerUser, OperatorUser } from './user-context'

type Room = Tables<'rooms'>

export type ServerUser = PlayerUser | OperatorUser

/**
 * Get the authenticated user and their profile data server-side
 * This is the most secure approach as user data never leaves the server
 */
export async function getServerUser(): Promise<ServerUser | null> {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (!user || authError) {
      return null
    }

    // Try to load as player first (most common case)
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('auth_id', user.id)
      .single()

    if (player && !playerError) {
      // Get phone number from auth user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      return {
        type: 'player',
        profile: player,
        phoneNumber: authUser?.phone || undefined,
      }
    }

    // If no player profile found, try to load as operator
    const { data: operator, error: operatorError } = await supabase
      .from('operators')
      .select(
        `
        *,
        room:rooms(*)
      `
      )
      .eq('auth_id', user.id)
      .eq('is_active', true)
      .single()

    if (operator && !operatorError) {
      return {
        type: 'operator',
        profile: operator,
        room: operator.room as Room | null,
      }
    }

    // If neither player nor operator found, return null
    return null
  } catch (_error) {
    // Silently handle errors in production
    return null
  }
}

/**
 * Get user type for middleware routing decisions
 */
export async function getUserType(): Promise<
  'player' | 'operator' | 'superadmin' | null
> {
  try {
    const user = await getServerUser()

    if (!user) return null

    if (user.type === 'player') return 'player'

    if (user.type === 'operator') {
      return user.profile.role === 'superadmin' ? 'superadmin' : 'operator'
    }

    return null
  } catch (_error) {
    // Silently handle errors in production
    return null
  }
}

/**
 * Check if user is authenticated (has valid session)
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const user = await getServerUser()
    return user !== null
  } catch (_error) {
    // Silently handle errors in production
    return false
  }
}
