import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types'
import { parseIPRestrictions } from './ip-validation'

export interface RoomIPRestrictions {
  id?: string
  room_id: string
  allowed_ips: string[] | null
  ip_restriction_enabled: boolean | null
}

/**
 * Get IP restrictions for a room
 * Accessible by room admins and superadmins due to RLS policies
 */
export async function getRoomIPRestrictions(
  supabase: SupabaseClient<Database>,
  roomId: string
): Promise<RoomIPRestrictions | null> {
  try {
    const { data, error } = await supabase
      .from('room_ip_restrictions')
      .select('*')
      .eq('room_id', roomId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data || null
  } catch (error) {
    // Log error for debugging
    console.error('Error fetching room IP restrictions:', error)
    return null
  }
}

/**
 * Create or update IP restrictions for a room
 * Accessible by room admins and superadmins due to RLS policies
 */
export async function upsertRoomIPRestrictions(
  supabase: SupabaseClient<Database>,
  roomId: string,
  restrictions: {
    allowed_ips: string[] | null
    ip_restriction_enabled: boolean | null
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('room_ip_restrictions').upsert({
      room_id: roomId,
      allowed_ips: restrictions.allowed_ips,
      ip_restriction_enabled: restrictions.ip_restriction_enabled,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    // Log error for debugging
    console.error('Error upserting room IP restrictions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Delete IP restrictions for a room
 * Accessible by room admins and superadmins due to RLS policies
 */
export async function deleteRoomIPRestrictions(
  supabase: SupabaseClient<Database>,
  roomId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('room_ip_restrictions')
      .delete()
      .eq('room_id', roomId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    // Log error for debugging
    console.error('Error deleting room IP restrictions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Validate and parse IP restrictions input
 */
export function validateIPRestrictionsInput(input: string): {
  validIPs: string[]
  errors: string[]
} {
  return parseIPRestrictions(input)
}

/**
 * Get room ID by room code
 */
export async function getRoomIdByCode(
  supabase: SupabaseClient<Database>,
  roomCode: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('id')
      .eq('code', roomCode)
      .eq('is_active', true)
      .single()

    if (error) {
      return null
    }

    return data.id
  } catch (error) {
    // Log error for debugging
    console.error('Error fetching room ID:', error)
    return null
  }
}
