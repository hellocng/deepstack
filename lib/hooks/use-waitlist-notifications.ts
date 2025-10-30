'use client'

import { useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
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

interface UseWaitlistNotificationsOptions {
  roomId: string
  playerId?: string
  onEntryUpdate?: (entry: WaitlistEntry) => void
}

export function useWaitlistNotifications({
  roomId,
  playerId,
  onEntryUpdate,
}: UseWaitlistNotificationsOptions): void {
  const supabase = createClient()

  const showNotification = useCallback(
    (
      title: string,
      description: string,
      variant: 'default' | 'destructive' | 'success' = 'default'
    ): void => {
      const notify =
        variant === 'destructive'
          ? toast.error
          : variant === 'success'
            ? toast.success
            : toast
      notify(title, { description })
    },
    []
  )

  useEffect(() => {
    if (!roomId) return

    // Set up real-time subscription for waitlist changes
    const channel = supabase
      .channel(`waitlist-notifications-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'waitlist_entries',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newEntry = payload.new as WaitlistEntry

          // Only show notifications for player's own entries
          if (playerId && newEntry.player_id === playerId) {
            showNotification(
              'Added to Waitlist',
              `You've been added to the waitlist for ${newEntry.game?.name || 'a game'}`,
              'success'
            )
          }

          onEntryUpdate?.(newEntry)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'waitlist_entries',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const updatedEntry = payload.new as WaitlistEntry
          const oldEntry = payload.old as WaitlistEntry

          // Only show notifications for player's own entries
          if (playerId && updatedEntry.player_id === playerId) {
            // Status change notifications
            if (updatedEntry.status !== oldEntry.status) {
              switch (updatedEntry.status) {
                case 'waiting':
                  showNotification(
                    'Checked In',
                    `You've been checked in for ${updatedEntry.game?.name || 'a game'}`,
                    'success'
                  )
                  break
                case 'notified':
                  showNotification(
                    'Seat Available!',
                    `A seat is available for ${updatedEntry.game?.name || 'a game'}. You have 5 minutes to respond.`,
                    'default'
                  )
                  break
                case 'seated':
                  showNotification(
                    'Seated!',
                    `You've been seated at ${updatedEntry.game?.name || 'a game'}`,
                    'success'
                  )
                  break
                case 'cancelled':
                  showNotification(
                    'Waitlist Entry Cancelled',
                    `Your waitlist entry for ${updatedEntry.game?.name || 'a game'} has been cancelled`,
                    'destructive'
                  )
                  break
                case 'expired':
                  showNotification(
                    'Waitlist Entry Expired',
                    `Your waitlist entry for ${updatedEntry.game?.name || 'a game'} has expired`,
                    'destructive'
                  )
                  break
              }
            }
          }

          onEntryUpdate?.(updatedEntry)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'waitlist_entries',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const deletedEntry = payload.old as WaitlistEntry

          // Only show notifications for player's own entries
          if (playerId && deletedEntry.player_id === playerId) {
            showNotification(
              'Waitlist Entry Removed',
              `Your waitlist entry for ${deletedEntry.game?.name || 'a game'} has been removed`,
              'destructive'
            )
          }

          onEntryUpdate?.(deletedEntry)
        }
      )
      .subscribe()

    return (): void => {
      channel.unsubscribe()
    }
  }, [roomId, playerId, supabase, showNotification, onEntryUpdate])
}
