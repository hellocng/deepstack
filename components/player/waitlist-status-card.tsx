'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CountdownBadge } from '@/components/ui/countdown-badge'
import {
  getStatusConfig,
  getTargetTime,
  type WaitlistStatus,
} from '@/lib/waitlist-status-utils'
import { Clock, Users, X, RefreshCw } from 'lucide-react'
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

interface WaitlistStatusCardProps {
  roomId: string
  playerId: string
}

export function WaitlistStatusCard({
  roomId,
  playerId,
}: WaitlistStatusCardProps): JSX.Element {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()

      const { data, error: fetchError } = await supabase
        .from('waitlist_entries')
        .select(
          `
          *,
          player:players(id, alias, avatar_url),
          game:games(id, name, game_type, small_blind, big_blind)
        `
        )
        .eq('room_id', roomId)
        .eq('player_id', playerId)
        .in('status', ['waiting', 'calledin', 'notified'])
        .order('position', { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      setEntries(data || [])
    } catch (err) {
      console.error('Error fetching waitlist entries:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch entries')
    } finally {
      setLoading(false)
    }
  }, [roomId, playerId])

  const cancelEntry = async (entryId: string): Promise<void> => {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('waitlist_entries')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'player',
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId)

      if (error) {
        throw error
      }

      // Refresh entries
      await fetchEntries()
    } catch (err) {
      console.error('Error cancelling entry:', err)
      setError(err instanceof Error ? err.message : 'Failed to cancel entry')
    }
  }

  useEffect(() => {
    fetchEntries()

    // Set up real-time subscription
    const supabase = createClient()

    const subscription = supabase
      .channel(`player-waitlist-${playerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waitlist_entries',
          filter: `player_id=eq.${playerId}`,
        },
        () => {
          fetchEntries()
        }
      )
      .subscribe()

    return (): void => {
      subscription.unsubscribe()
    }
  }, [playerId, fetchEntries])

  if (loading) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='flex items-center justify-center'>
            <RefreshCw className='h-6 w-6 animate-spin' />
            <span className='ml-2'>Loading waitlist status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='text-center text-red-600'>
            <p>{error}</p>
            <Button
              variant='outline'
              size='sm'
              onClick={fetchEntries}
              className='mt-2'
            >
              <RefreshCw className='h-4 w-4 mr-2' />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='text-center text-muted-foreground'>
            <Users className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <p className='text-lg font-medium'>No Active Waitlist Entries</p>
            <p className='text-sm'>
              You&apos;re not currently on any waitlists. Join a game to get
              started!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Users className='h-5 w-5' />
          Your Waitlist Status
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {entries.map((entry) => {
          const statusConfig = getStatusConfig(entry.status)
          const targetTime = getTargetTime(
            entry.status as WaitlistStatus,
            entry.notified_at || entry.checked_in_at,
            entry.created_at
          )

          return (
            <div
              key={entry.id}
              className='flex items-center justify-between p-4 border rounded-lg'
            >
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2 mb-2'>
                  <h3 className='font-medium truncate'>
                    {entry.game?.name || 'Unknown Game'}
                  </h3>
                  <Badge
                    variant={
                      statusConfig.variant as
                        | 'default'
                        | 'secondary'
                        | 'destructive'
                        | 'outline'
                    }
                  >
                    {statusConfig.label}
                  </Badge>
                </div>

                <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                  <div className='flex items-center gap-1'>
                    <Clock className='h-4 w-4' />
                    <span>
                      {entry.game?.game_type?.replace('_', ' ').toUpperCase() ||
                        'Unknown'}
                    </span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <span>
                      ${entry.game?.small_blind}/${entry.game?.big_blind}
                    </span>
                  </div>
                </div>

                {/* Notes not guaranteed in type; omit for type safety */}

                {statusConfig.showCountdown && targetTime && (
                  <div className='mt-2'>
                    <CountdownBadge
                      targetTime={targetTime}
                      onExpired={(): void => {
                        fetchEntries()
                      }}
                    />
                  </div>
                )}
              </div>

              <div className='flex items-center gap-2 ml-4'>
                {entry.status === 'calledin' && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={(): void => {
                      void cancelEntry(entry.id)
                    }}
                  >
                    <X className='h-4 w-4 mr-1' />
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
