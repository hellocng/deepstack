import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type WaitlistEntry = Database['public']['Tables']['waitlist_entries']['Row'] & {
  player: {
    id: string
    alias: string | null
    avatar_url: string | null
  } | null
  game: {
    id: string
    name: string
    game_type: string
    small_blind: number
    big_blind: number
  } | null
}

type BasicWaitlistEntry =
  Database['public']['Tables']['waitlist_entries']['Row']

export class WaitlistExpirySystem {
  private static readonly CALLED_TIMEOUT_MINUTES = 90
  private static readonly NOTIFIED_TIMEOUT_MINUTES = 5

  /**
   * Check and expire entries that have exceeded their time limits
   */
  static async checkAndExpireEntries(roomId: string): Promise<void> {
    const supabase = createClient()
    const now = new Date()

    // Get entries that need to be checked for expiry
    const { data: entries, error } = await supabase
      .from('waitlist_entries')
      .select('*')
      .eq('room_id', roomId)
      .in('status', ['calledin', 'notified'])

    if (error) {
      console.error('Error fetching entries for expiry check:', error)
      return
    }

    if (!entries || entries.length === 0) return

    const expiredEntries: string[] = []

    for (const entry of entries) {
      const shouldExpire = this.shouldExpireEntry(entry, now)
      if (shouldExpire) {
        expiredEntries.push(entry.id)
      }
    }

    if (expiredEntries.length > 0) {
      await this.expireEntries(expiredEntries)
    }
  }

  /**
   * Check if a specific entry should be expired
   */
  private static shouldExpireEntry(
    entry: BasicWaitlistEntry,
    now: Date
  ): boolean {
    let timestamp: string | null = null

    if (entry.status === 'calledin') {
      // For 'calledin' status, use created_at for the 90-minute countdown
      timestamp = entry.created_at
    } else if (entry.status === 'notified') {
      // For 'notified' status, use notified_at for the 5-minute countdown
      timestamp = entry.notified_at
    }

    if (!timestamp) return false

    const entryTime = new Date(timestamp)
    const timeoutMinutes =
      entry.status === 'calledin'
        ? this.CALLED_TIMEOUT_MINUTES
        : this.NOTIFIED_TIMEOUT_MINUTES

    const expiryTime = new Date(
      entryTime.getTime() + timeoutMinutes * 60 * 1000
    )
    return now >= expiryTime
  }

  /**
   * Expire multiple entries
   */
  private static async expireEntries(entryIds: string[]): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
      .from('waitlist_entries')
      .update({
        status: 'expired',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'system',
        updated_at: new Date().toISOString(),
      })
      .in('id', entryIds)

    if (error) {
      console.error('Error expiring entries:', error)
    }
  }

  /**
   * Get expired entries for the last hour
   */
  static async getExpiredEntries(roomId: string): Promise<WaitlistEntry[]> {
    const supabase = createClient()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('waitlist_entries')
      .select(
        `
        *,
        player:players(id, alias, avatar_url),
        game:games(id, name, game_type, small_blind, big_blind)
      `
      )
      .eq('room_id', roomId)
      .in('status', ['cancelled', 'expired'])
      .or(`cancelled_at.gte.${oneHourAgo},cancelled_at.is.null`)
      .order('cancelled_at', { ascending: false, nullsFirst: true })

    if (error) {
      console.error('Error fetching expired entries:', error)
      return []
    }

    return data || []
  }

  /**
   * Start the automatic expiry checking system
   */
  static startExpiryChecking(roomId: string): () => void {
    // Check every minute
    const interval = setInterval(() => {
      this.checkAndExpireEntries(roomId)
    }, 60 * 1000)

    // Return cleanup function
    return () => {
      clearInterval(interval)
    }
  }
}
