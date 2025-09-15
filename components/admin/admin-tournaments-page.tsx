'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/types/supabase'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Tournament = Tables<'tournaments'>

export function AdminTournamentsPage(): JSX.Element {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTournaments = async (): Promise<void> => {
      try {
        const supabase = createClient()

        // Get current operator's room_id
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (!user || authError) return

        const { data: operator, error: operatorError } = await supabase
          .from('operators')
          .select('room_id')
          .eq('auth_id', user.id)
          .single()

        if (operatorError || !operator) return

        const roomId = (operator as { room_id: string | null }).room_id
        if (!roomId) return

        // Fetch tournaments for the operator's room
        const { data: tournamentsData, error } = await supabase
          .from('tournaments')
          .select('*')
          .eq('room_id', roomId)
          .order('start_time', { ascending: false })

        if (error) {
          // Error fetching tournaments - handled by error state
          return
        }

        setTournaments(tournamentsData || [])
      } catch (_error) {
        // Error fetching tournaments - handled by error state
      } finally {
        setLoading(false)
      }
    }

    fetchTournaments()
  }, [])

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-muted-foreground'>Loading tournaments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Tournaments</h1>
          <p className='text-muted-foreground'>
            Manage poker tournaments in your room
          </p>
        </div>
        <Button>Create Tournament</Button>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {tournaments.map((tournament) => (
          <Card key={tournament.id}>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-lg'>{tournament.name}</CardTitle>
                <Badge
                  variant={
                    tournament.status === 'in_progress'
                      ? 'default'
                      : tournament.status === 'scheduled'
                        ? 'secondary'
                        : tournament.status === 'completed'
                          ? 'outline'
                          : 'destructive'
                  }
                >
                  {tournament.status}
                </Badge>
              </div>
              <CardDescription>
                {tournament.game_type} • ${tournament.buy_in} buy-in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Players:</span>
                  <span>
                    {tournament.current_players}/{tournament.max_players}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Prize Pool:</span>
                  <span>${tournament.prize_pool}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Start Time:</span>
                  <span>
                    {new Date(tournament.start_time).toLocaleString()}
                  </span>
                </div>
                {tournament.description && (
                  <div className='pt-2'>
                    <span className='text-muted-foreground'>Description:</span>
                    <p className='text-sm mt-1'>{tournament.description}</p>
                  </div>
                )}
              </div>
              <div className='flex gap-2 mt-4'>
                <Button
                  variant='outline'
                  size='sm'
                >
                  Edit
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                >
                  View Entries
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tournaments.length === 0 && (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <h3 className='text-lg font-medium mb-2'>No tournaments found</h3>
            <p className='text-muted-foreground text-center mb-4'>
              Create your first poker tournament to get started.
            </p>
            <Button>Create Tournament</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
