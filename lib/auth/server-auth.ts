import { Tables } from '@/types'
import { PlayerUser, OperatorUser } from './user-context'
import { createClient } from '@/lib/supabase/server'

type Room = Tables<'rooms'>

export type ServerUser = PlayerUser | OperatorUser

/**
 * Get the authenticated user and their profile data server-side
 * This is the most secure approach as user data never leaves the server
 */
export async function getServerUser(): Promise<ServerUser | null> {
  try {
    const supabase = await createClient()

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (!user || authError) {
      return null
    }

    // First, check if user is an operator (including superadmin)
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
      .maybeSingle()

    if (operator && !operatorError) {
      return {
        type: 'operator',
        profile: operator,
        room: operator.room as Room | null,
      }
    }

    // If no operator profile found, try to load as player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('auth_id', user.id)
      .maybeSingle()

    if (player && !playerError) {
      return {
        type: 'player',
        profile: player,
        phoneNumber: user.phone || undefined,
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
