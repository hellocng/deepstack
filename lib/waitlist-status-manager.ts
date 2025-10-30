import { createClient } from '@/lib/supabase/client'
import { WaitlistNotificationService } from './waitlist-notification-service'
import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

type WaitlistEntry = Database['public']['Tables']['waitlist_entries']['Row']
type WaitlistStatus = Database['public']['Enums']['waitlist_status']

export class WaitlistStatusManager {
  private static supabase: SupabaseClient<Database> | null = null

  private static getSupabase(): SupabaseClient<Database> {
    if (!this.supabase) {
      this.supabase = createClient()
    }
    return this.supabase
  }

  static setSupabaseClient(client: SupabaseClient<Database>): void {
    this.supabase = client
  }

  /**
   * Update waitlist entry status with proper validation and notifications
   */
  static async updateStatus(
    entryId: string,
    newStatus: WaitlistStatus,
    updatedBy: 'player' | 'staff' | 'system' = 'staff',
    additionalData?: {
      notes?: string
      cancelledBy?: 'player' | 'staff' | 'system'
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = this.getSupabase()

      // Get current entry
      const { data: currentEntry, error: fetchError } = await supabase
        .from('waitlist_entries')
        .select('*')
        .eq('id', entryId)
        .single()

      if (fetchError || !currentEntry) {
        return { success: false, error: 'Entry not found' }
      }

      // Validate status transition
      const isValidTransition = this.validateStatusTransition(
        currentEntry.status as WaitlistStatus,
        newStatus
      )

      if (!isValidTransition) {
        return {
          success: false,
          error: `Invalid status transition from ${currentEntry.status} to ${newStatus}`,
        }
      }

      // Prepare update data
      const now = new Date().toISOString()
      const updateData: Partial<WaitlistEntry> = {
        status: newStatus,
        updated_at: now,
      }

      // Set appropriate timestamps based on status
      switch (newStatus) {
        case 'waiting':
          updateData.checked_in_at = now
          break
        case 'notified':
          updateData.notified_at = now
          break
        case 'cancelled':
          updateData.cancelled_at = now
          updateData.cancelled_by = additionalData?.cancelledBy || updatedBy
          break
        case 'seated':
          // Seated status is handled by table assignment
          break
        case 'expired':
          updateData.cancelled_at = now
          updateData.cancelled_by = 'system'
          break
      }

      // Notes field not present in typed row; skipping optional notes update

      // Update the entry
      const { error: updateError } = await supabase
        .from('waitlist_entries')
        .update(updateData)
        .eq('id', entryId)
        .select('*')
        .single()

      if (updateError) {
        console.error('Error updating waitlist entry:', updateError)
        return { success: false, error: 'Failed to update entry' }
      }

      // Send notification if status changed
      if (currentEntry.status !== newStatus) {
        await WaitlistNotificationService.notifyStatusChange(
          entryId,
          newStatus,
          currentEntry.status as string
        )
      }

      return { success: true }
    } catch (error) {
      console.error('Error in updateStatus:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Check in a player (calledin -> waiting)
   */
  static async checkInPlayer(
    entryId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateStatus(entryId, 'waiting', 'staff', { notes })
  }

  /**
   * Notify player of available seat (waiting -> notified)
   */
  static async notifyPlayer(
    entryId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateStatus(entryId, 'notified', 'staff', { notes })
  }

  /**
   * Cancel waitlist entry
   */
  static async cancelEntry(
    entryId: string,
    cancelledBy: 'player' | 'staff' | 'system' = 'staff',
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateStatus(entryId, 'cancelled', cancelledBy, {
      notes,
      cancelledBy,
    })
  }

  /**
   * Expire waitlist entry
   */
  static async expireEntry(
    entryId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateStatus(entryId, 'expired', 'system', {
      notes: notes || 'Entry expired due to timeout',
      cancelledBy: 'system',
    })
  }

  /**
   * Seat player (notified -> seated)
   */
  static async seatPlayer(
    entryId: string,
    tableId: string,
    seatNumber: number,
    notes?: string,
    cancelOtherEntries: boolean = true
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = this.getSupabase()

      // Get the entry to find the player
      const entry = await this.getEntry(entryId)
      if (!entry || !entry.player_id) {
        return { success: false, error: 'Entry not found' }
      }

      // Update waitlist entry
      const result = await this.updateStatus(entryId, 'seated', 'staff', {
        notes,
      })

      if (!result.success) {
        return result
      }

      // Resolve active table session for tableId
      const { data: tableSession, error: sessionFetchError } = await supabase
        .from('table_sessions')
        .select('id')
        .eq('table_id', tableId)
        .is('end_time', null)
        .single()

      if (sessionFetchError || !tableSession) {
        return { success: false, error: 'No active table session' }
      }

      // Create player session
      const { error: sessionError } = await supabase
        .from('player_sessions')
        .insert({
          table_session_id: tableSession.id,
          seat_number: seatNumber,
          player_id: entry.player_id,
          start_time: new Date().toISOString(),
        })

      if (sessionError) {
        console.error('Error creating player session:', sessionError)
        return { success: false, error: 'Failed to create player session' }
      }

      // Cancel other waitlist entries for this player if requested
      if (cancelOtherEntries) {
        const { error: cancelError } = await supabase
          .from('waitlist_entries')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_by: 'system',
            updated_at: new Date().toISOString(),
          })
          .eq('player_id', entry.player_id)
          .in('status', ['waiting', 'calledin', 'notified'])
          .neq('id', entryId)

        if (cancelError) {
          console.error('Error cancelling other entries:', cancelError)
          // Don't fail the entire operation for this
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error seating player:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Get waitlist entry by ID
   */
  static async getEntry(entryId: string): Promise<WaitlistEntry | null> {
    try {
      const supabase = this.getSupabase()

      const { data: entry, error } = await supabase
        .from('waitlist_entries')
        .select('*')
        .eq('id', entryId)
        .single()

      if (error || !entry) {
        return null
      }

      return entry
    } catch (error) {
      console.error('Error getting entry:', error)
      return null
    }
  }

  /**
   * Validate if a status transition is allowed
   */
  private static validateStatusTransition(
    currentStatus: WaitlistStatus | null,
    newStatus: WaitlistStatus
  ): boolean {
    if (!currentStatus) return false

    const validTransitions: Record<WaitlistStatus, WaitlistStatus[]> = {
      calledin: ['waiting', 'cancelled', 'expired'],
      waiting: ['notified', 'cancelled', 'expired'],
      notified: ['seated', 'cancelled', 'expired'],
      seated: [], // Terminal state
      cancelled: [], // Terminal state
      expired: [], // Terminal state
    }

    return validTransitions[currentStatus]?.includes(newStatus) || false
  }

  /**
   * Get entries that need expiry warnings
   */
  static async getEntriesNeedingExpiryWarning(
    roomId: string,
    warningMinutes: number = 10
  ): Promise<WaitlistEntry[]> {
    try {
      const supabase = this.getSupabase()
      const warningTime = new Date()
      warningTime.setMinutes(warningTime.getMinutes() - warningMinutes)

      // Get calledin entries that are close to expiring
      const { data: calledInEntries, error: calledInError } = await supabase
        .from('waitlist_entries')
        .select('*')
        .eq('room_id', roomId)
        .eq('status', 'calledin')
        .lt('created_at', warningTime.toISOString())

      if (calledInError) {
        console.error('Error fetching calledin entries:', calledInError)
        return []
      }

      // Get notified entries that are close to expiring
      const { data: notifiedEntries, error: notifiedError } = await supabase
        .from('waitlist_entries')
        .select('*')
        .eq('room_id', roomId)
        .eq('status', 'notified')
        .lt('notified_at', warningTime.toISOString())

      if (notifiedError) {
        console.error('Error fetching notified entries:', notifiedError)
        return []
      }

      return [...(calledInEntries || []), ...(notifiedEntries || [])]
    } catch (error) {
      console.error('Error getting entries needing expiry warning:', error)
      return []
    }
  }

  /**
   * Process expiry warnings for a room
   */
  static async processExpiryWarnings(roomId: string): Promise<void> {
    try {
      const entries = await this.getEntriesNeedingExpiryWarning(roomId, 10)

      for (const entry of entries) {
        const remainingMinutes = this.calculateRemainingMinutes(entry)

        if (remainingMinutes <= 10 && remainingMinutes > 0) {
          await WaitlistNotificationService.notifyExpiryWarning(
            entry.id,
            remainingMinutes
          )
        }
      }
    } catch (error) {
      console.error('Error processing expiry warnings:', error)
    }
  }

  /**
   * Calculate remaining minutes until expiry
   */
  private static calculateRemainingMinutes(entry: WaitlistEntry): number {
    const now = new Date()
    let startTime: Date

    if (entry.status === 'calledin') {
      startTime = new Date(entry.created_at || '')
    } else if (entry.status === 'notified') {
      startTime = new Date(entry.notified_at || '')
    } else {
      return 0
    }

    const timeoutMinutes = entry.status === 'calledin' ? 90 : 5
    const expiryTime = new Date(
      startTime.getTime() + timeoutMinutes * 60 * 1000
    )
    const remainingMs = expiryTime.getTime() - now.getTime()

    return Math.max(0, Math.ceil(remainingMs / (1000 * 60)))
  }
}
