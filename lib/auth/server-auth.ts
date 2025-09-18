import { Tables } from '@/types'
import { PlayerUser, OperatorUser } from './user-context'
import { createClient } from '@/lib/supabase/server'
import { createRoomResolver } from '@/lib/rooms/context'
import type { NextRequest } from 'next/server'

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

/**
 * Require operator access with IP validation for API routes
 * This function validates both authentication and IP restrictions
 */
export async function requireOperatorAccess(
  request: NextRequest,
  roomIdentifier: string
): Promise<{
  user: ServerUser
  operatorData: { id: string; role: string; room_id: string | null }
}> {
  const supabase = await createClient()
  const roomResolver = createRoomResolver(supabase)

  // First, get the authenticated user
  const user = await getServerUser()
  if (!user || user.type !== 'operator') {
    throw new Error('Authentication required')
  }

  const { context, validation } = await roomResolver.validateAdminAccess(
    request,
    roomIdentifier
  )

  if (!context) {
    throw new Error('Room not found')
  }

  if (validation && !validation.isAllowed) {
    throw new Error(`IP access denied: ${validation.reason}`)
  }

  if (user.profile.room_id !== context.id) {
    throw new Error('Access denied to this room')
  }

  return {
    user,
    operatorData: user.profile,
  }
}

/**
 * Require admin access with IP validation for API routes
 * This function validates authentication, IP restrictions, and admin role
 */
export async function requireAdminAccess(
  request: NextRequest,
  roomCode: string
): Promise<{
  user: ServerUser
  operatorData: { id: string; role: string; room_id: string | null }
}> {
  const { user, operatorData } = await requireOperatorAccess(request, roomCode)

  // Check if user has admin privileges
  if (!['admin', 'superadmin'].includes(operatorData.role)) {
    throw new Error('Admin access required')
  }

  return { user, operatorData }
}

/**
 * Require Super Admin access for API routes
 * Super Admins bypass IP restrictions but still need authentication
 */
export async function requireSuperAdminAccess(): Promise<{
  user: ServerUser
  operatorData: { id: string; role: string; room_id: string | null }
}> {
  const user = await getServerUser()
  if (!user || user.type !== 'operator') {
    throw new Error('Authentication required')
  }

  if (user.profile.role !== 'superadmin') {
    throw new Error('Super Admin access required')
  }

  return {
    user,
    operatorData: user.profile,
  }
}
