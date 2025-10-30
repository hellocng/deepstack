import { createClient } from '@/lib/supabase/client'

interface NotificationData {
  playerId: string
  gameName: string
  message: string
  type:
    | 'status_change'
    | 'position_change'
    | 'expiry_warning'
    | 'seat_available'
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

export class WaitlistNotificationService {
  private static supabase: ReturnType<typeof createClient> | null = null

  private static getSupabase(): ReturnType<typeof createClient> {
    if (!this.supabase) {
      this.supabase = createClient()
    }
    return this.supabase
  }

  /**
   * Send notification to player about waitlist status change
   */
  static async notifyStatusChange(
    entryId: string,
    newStatus: string,
    _oldStatus: string
  ): Promise<void> {
    try {
      const supabase = this.getSupabase()

      // Get entry details
      const { data: entry, error: entryError } = await supabase
        .from('waitlist_entries')
        .select(
          `
          id,
          player_id,
          game:games(name),
          status
        `
        )
        .eq('id', entryId)
        .single()

      if (entryError || !entry) {
        console.error('Error fetching entry for notification:', entryError)
        return
      }

      // Get player details
      if (!entry.player_id) {
        console.error('Missing player_id for notification entry')
        return
      }
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('id, alias, phone_number')
        .eq('id', entry.player_id)
        .single()

      if (playerError || !player) {
        console.error('Error fetching player for notification:', playerError)
        return
      }

      // Create notification message based on status change
      let message = ''
      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'

      switch (newStatus) {
        case 'waiting':
          message = `You've been checked in for ${entry.game?.name || 'a game'}. You're now on the active waitlist.`
          priority = 'medium'
          break
        case 'notified':
          message = `A seat is available for ${entry.game?.name || 'a game'}! You have 5 minutes to respond.`
          priority = 'urgent'
          break
        case 'seated':
          message = `You've been seated at ${entry.game?.name || 'a game'}. Enjoy your game!`
          priority = 'high'
          break
        case 'cancelled':
          message = `Your waitlist entry for ${entry.game?.name || 'a game'} has been cancelled.`
          priority = 'medium'
          break
        case 'expired':
          message = `Your waitlist entry for ${entry.game?.name || 'a game'} has expired due to timeout.`
          priority = 'medium'
          break
        default:
          return // No notification needed for other statuses
      }

      // Store notification in database
      await this.storeNotification({
        playerId: entry.player_id,
        gameName: entry.game?.name || 'Unknown Game',
        message,
        type: 'status_change',
        priority,
      })

      // Send real-time notification
      await this.sendRealtimeNotification(entry.player_id, {
        title: 'Waitlist Update',
        message,
        type: newStatus,
        priority,
      })

      // Send SMS for urgent notifications (if phone number available)
      if (priority === 'urgent' && player.phone_number) {
        await this.sendSMSNotification(player.phone_number, message)
      }
    } catch (error) {
      console.error('Error sending status change notification:', error)
    }
  }

  /**
   * Send notification about position change
   */
  static async notifyPositionChange(
    entryId: string,
    newPosition: number,
    oldPosition: number
  ): Promise<void> {
    try {
      const supabase = this.getSupabase()

      // Get entry details
      const { data: entry, error: entryError } = await supabase
        .from('waitlist_entries')
        .select(
          `
          id,
          player_id,
          game:games(name)
        `
        )
        .eq('id', entryId)
        .single()

      if (entryError || !entry) {
        console.error(
          'Error fetching entry for position notification:',
          entryError
        )
        return
      }

      const direction = newPosition < oldPosition ? 'up' : 'down'
      const message = `You moved ${direction} to position ${newPosition} for ${entry.game?.name || 'a game'}.`

      // Store notification
      if (!entry.player_id) {
        console.error('Missing player_id for position change notification')
        return
      }
      await this.storeNotification({
        playerId: entry.player_id,
        gameName: entry.game?.name || 'Unknown Game',
        message,
        type: 'position_change',
        priority: 'low',
      })

      // Send real-time notification
      await this.sendRealtimeNotification(entry.player_id, {
        title: 'Position Updated',
        message,
        type: 'position_change',
        priority: 'low',
      })
    } catch (error) {
      console.error('Error sending position change notification:', error)
    }
  }

  /**
   * Send expiry warning notification
   */
  static async notifyExpiryWarning(
    entryId: string,
    minutesRemaining: number
  ): Promise<void> {
    try {
      const supabase = this.getSupabase()

      // Get entry details
      const { data: entry, error: entryError } = await supabase
        .from('waitlist_entries')
        .select(
          `
          id,
          player_id,
          game:games(name)
        `
        )
        .eq('id', entryId)
        .single()

      if (entryError || !entry) {
        console.error('Error fetching entry for expiry warning:', entryError)
        return
      }

      const message = `Your waitlist entry for ${entry.game?.name || 'a game'} will expire in ${minutesRemaining} minutes. Please check in soon.`

      // Store notification
      if (!entry.player_id) {
        console.error('Missing player_id for expiry warning notification')
        return
      }
      await this.storeNotification({
        playerId: entry.player_id,
        gameName: entry.game?.name || 'Unknown Game',
        message,
        type: 'expiry_warning',
        priority: 'high',
      })

      // Send real-time notification
      await this.sendRealtimeNotification(entry.player_id, {
        title: 'Expiry Warning',
        message,
        type: 'expiry_warning',
        priority: 'high',
      })
    } catch (error) {
      console.error('Error sending expiry warning notification:', error)
    }
  }

  /**
   * Store notification in database
   */
  private static async storeNotification(
    _data: NotificationData
  ): Promise<void> {
    try {
      // Optional: persist notifications if a notifications table exists
      // Skipping persistence since 'notifications' table is not defined in types
      return
    } catch (error) {
      console.error('Error storing notification:', error)
    }
  }

  /**
   * Send real-time notification via Supabase realtime
   */
  private static async sendRealtimeNotification(
    playerId: string,
    notification: {
      title: string
      message: string
      type: string
      priority: string
    }
  ): Promise<void> {
    try {
      const supabase = this.getSupabase()

      await supabase.channel(`player-notifications-${playerId}`).send({
        type: 'broadcast',
        event: 'waitlist_notification',
        payload: notification,
      })
    } catch (error) {
      console.error('Error sending real-time notification:', error)
    }
  }

  /**
   * Send SMS notification (placeholder - integrate with SMS service)
   */
  private static async sendSMSNotification(
    phone: string,
    message: string
  ): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, etc.)
    console.warn(`SMS to ${phone}: ${message}`)
  }
}
