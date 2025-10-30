'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loading } from '@/components/ui/loading'
import { Clock, User, X, RotateCcw } from 'lucide-react'
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

interface ExpiredWaitlistTableProps {
  roomId: string
  onRejoinWaitlist?: (entry: WaitlistEntry) => void
}

export function ExpiredWaitlistTable({
  roomId,
  onRejoinWaitlist,
}: ExpiredWaitlistTableProps): JSX.Element {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!roomId) return

    const fetchExpiredEntries = async (): Promise<void> => {
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
          .in('status', ['expired', 'cancelled'])
          .order('updated_at', { ascending: false })
          .limit(50)

        if (fetchError) {
          throw fetchError
        }

        setEntries(data || [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch expired entries'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchExpiredEntries()
  }, [roomId])

  if (!roomId) {
    return (
      <Card>
        <CardContent className='p-6 text-center'>
          <p className='text-muted-foreground'>Room ID not available</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className='p-6'>
          <Loading
            size='md'
            text='Loading expired entries...'
          />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className='p-6 text-center'>
          <p className='text-red-600'>{error}</p>
        </CardContent>
      </Card>
    )
  }

  const getCancelledByLabel = (cancelledBy: string | null): string => {
    switch (cancelledBy) {
      case 'player':
        return 'Player'
      case 'staff':
        return 'Staff'
      case 'system':
        return 'System (Expired)'
      case null:
        return 'Legacy'
      default:
        return 'Unknown'
    }
  }

  const getCancelledByIcon = (cancelledBy: string | null): JSX.Element => {
    switch (cancelledBy) {
      case 'player':
        return <User className='h-3 w-3' />
      case 'staff':
        return <X className='h-3 w-3' />
      case 'system':
        return <Clock className='h-3 w-3' />
      case null:
        return <Clock className='h-3 w-3' />
      default:
        return <X className='h-3 w-3' />
    }
  }

  const getStatusBadge = (status: string): JSX.Element => {
    const isExpired = status === 'expired'
    return (
      <Badge variant={isExpired ? 'destructive' : 'secondary'}>
        {isExpired ? 'Expired' : 'Cancelled'}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2'>
            <Clock className='h-5 w-5' />
            Recently Cancelled (Last Hour)
          </CardTitle>
          <Badge variant='secondary'>{entries.length} entries</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className='text-center py-8 text-muted-foreground'>
            <Clock className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <p>No cancelled entries in the last hour.</p>
          </div>
        ) : (
          <div className='space-y-2'>
            {/* Header row */}
            <div className='grid grid-cols-12 gap-4 items-center p-3 border-b font-medium text-sm text-muted-foreground'>
              <div className='col-span-3'>Player</div>
              <div className='col-span-2'>Game</div>
              <div className='col-span-2'>Status</div>
              <div className='col-span-2'>Cancelled By</div>
              <div className='col-span-2 text-right'>Joined Time</div>
              <div className='col-span-1 text-center'>Action</div>
            </div>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className='grid grid-cols-12 gap-4 items-center p-3 border rounded-lg'
              >
                <div className='col-span-3'>
                  <span className='font-medium'>
                    {entry.player?.alias || 'Unknown Player'}
                  </span>
                </div>

                <div className='col-span-2'>
                  <span className='text-sm text-muted-foreground'>
                    {entry.game?.name}
                  </span>
                </div>

                <div className='col-span-2'>
                  {getStatusBadge(entry.status || 'cancelled')}
                </div>

                <div className='col-span-2 flex items-center gap-1 text-sm text-muted-foreground'>
                  {getCancelledByIcon(entry.cancelled_by)}
                  <span>{getCancelledByLabel(entry.cancelled_by)}</span>
                </div>

                <div className='col-span-2 text-sm text-muted-foreground text-right'>
                  {entry.created_at
                    ? new Date(entry.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })
                    : '--:--'}
                </div>

                <div className='col-span-1 text-center'>
                  {onRejoinWaitlist && (
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => onRejoinWaitlist(entry)}
                      className='h-8 px-2'
                    >
                      <RotateCcw className='h-3 w-3' />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
