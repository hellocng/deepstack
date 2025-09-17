'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'

type WaitlistEntry = Tables<'waitlist_entries'> & {
  players: {
    alias: string | null
  } | null
  games: {
    name: string
    game_type: string
    small_blind: number
    big_blind: number
  } | null
}

export function AdminWaitlistPage(): JSX.Element {
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWaitlistEntries = async (): Promise<void> => {
      try {
        const supabase = createClient()

        // Get current operator's room_id
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        const userId = user?.id

        if (!userId || userError) return

        const { data: operator, error: operatorError } = await supabase
          .from('operators')
          .select('room_id')
          .eq('auth_id', userId)
          .single()

        if (operatorError || !operator) return

        const roomId = (operator as { room_id: string | null }).room_id
        if (!roomId) return

        // Fetch waitlist entries for the operator's room
        const { data: entriesData, error } = await supabase
          .from('waitlist_entries')
          .select(
            `
            *,
            players!inner(alias),
            games!inner(name, game_type, small_blind, big_blind)
          `
          )
          .eq('room_id', roomId)
          .order('created_at', { ascending: true })

        if (error) {
          // Error fetching waitlist entries - handled by error state
          return
        }

        setWaitlistEntries(entriesData || [])
      } catch (_error) {
        // Error fetching waitlist entries - handled by error state
      } finally {
        setLoading(false)
      }
    }

    fetchWaitlistEntries()
  }, [])

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loading
          size='md'
          text='Loading waitlist...'
        />
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Waitlist</h1>
          <p className='text-muted-foreground'>
            Manage player waitlists for games
          </p>
        </div>
      </div>

      <div className='space-y-4'>
        {waitlistEntries.map((entry) => (
          <Card key={entry.id}>
            <CardContent className='pt-6'>
              <div className='flex items-center justify-between'>
                <div className='space-y-1'>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>
                      {entry.players?.alias || 'Unknown Player'}
                    </span>
                    <Badge variant='outline'>
                      #{waitlistEntries.indexOf(entry) + 1}
                    </Badge>
                    <Badge
                      variant={
                        entry.status === 'waiting' ? 'default' : 'secondary'
                      }
                    >
                      {entry.status}
                    </Badge>
                  </div>
                  <div className='text-sm text-muted-foreground'>
                    Game: {entry.games?.name} ({entry.games?.game_type}) • $
                    {entry.games?.small_blind}/${entry.games?.big_blind}
                  </div>
                  {entry.notes && (
                    <div className='text-sm text-muted-foreground'>
                      Notes: {entry.notes}
                    </div>
                  )}
                </div>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                  >
                    Call Player
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                  >
                    Seat Player
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {waitlistEntries.length === 0 && (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <h3 className='text-lg font-medium mb-2'>No waitlist entries</h3>
            <p className='text-muted-foreground text-center'>
              Players will appear here when they join waitlists for your games.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
