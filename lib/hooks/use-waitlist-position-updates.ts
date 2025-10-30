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

interface UseWaitlistPositionUpdatesOptions {
  roomId: string
  playerId?: string
  onPositionUpdate?: (entry: WaitlistEntry, newPosition: number) => void
}

export function useWaitlistPositionUpdates({
  roomId,
  playerId,
  onPositionUpdate,
}: UseWaitlistPositionUpdatesOptions): void {
  const supabase = createClient()

  const showPositionNotification = useCallback(
    (gameName: string, newPosition: number, direction: 'up' | 'down'): void => {
      const message =
        direction === 'up'
          ? `You moved up to position ${newPosition} for ${gameName}`
          : `You moved down to position ${newPosition} for ${gameName}`

      const notify = direction === 'up' ? toast.success : toast
      notify('Position Updated', { description: message })
    },
    []
  )

  useEffect(() => {
    if (!roomId || !playerId) return

    // Track previous positions to detect changes
    const previousPositions = new Map<string, number>()

    const channel = supabase
      .channel(`waitlist-positions-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waitlist_entries',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const entry = payload.new as WaitlistEntry

          // Only process updates for the current player
          if (entry.player_id !== playerId) return

          try {
            // Get current position for this entry
            const { data: positionData, error } = await supabase
              .from('waitlist_entries')
              .select('position')
              .eq('id', entry.id)
              .single()

            if (error || !positionData) return

            const currentPosition = positionData.position
            const previousPosition = previousPositions.get(entry.id)

            // Update stored position
            previousPositions.set(entry.id, currentPosition || 0)

            // If this is a new entry, don't show position notification
            if (previousPosition === undefined) return

            // If position changed, show notification
            if (previousPosition !== currentPosition) {
              const direction =
                (currentPosition || 0) < previousPosition ? 'up' : 'down'
              showPositionNotification(
                entry.game?.name || 'a game',
                currentPosition || 0,
                direction
              )
            }

            onPositionUpdate?.(entry, currentPosition || 0)
          } catch (error) {
            console.error('Error processing position update:', error)
          }
        }
      )
      .subscribe()

    return (): void => {
      channel.unsubscribe()
    }
  }, [roomId, playerId, supabase, showPositionNotification, onPositionUpdate])
}
