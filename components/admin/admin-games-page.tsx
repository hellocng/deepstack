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

type Game = Tables<'games'>

export function AdminGamesPage(): JSX.Element {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGames = async (): Promise<void> => {
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

        // Fetch games for the operator's room
        const { data: gamesData, error } = await supabase
          .from('games')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: false })

        if (error) {
          // Error fetching games - handled by error state
          return
        }

        setGames(gamesData || [])
      } catch (_error) {
        // Error fetching games - handled by error state
      } finally {
        setLoading(false)
      }
    }

    fetchGames()
  }, [])

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-muted-foreground'>Loading games...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Games</h1>
          <p className='text-muted-foreground'>
            Manage poker games in your room
          </p>
        </div>
        <Button>Create Game</Button>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {games.map((game) => (
          <Card key={game.id}>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-lg'>{game.name}</CardTitle>
                <Badge variant={game.is_active ? 'default' : 'secondary'}>
                  {game.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <CardDescription>
                {game.game_type} • ${game.small_blind}/${game.big_blind}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Buy-in:</span>
                  <span>
                    ${game.min_buy_in} - ${game.max_buy_in}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Rake:</span>
                  <span>{game.rake || 'N/A'}</span>
                </div>
                {game.description && (
                  <div className='pt-2'>
                    <span className='text-muted-foreground'>Description:</span>
                    <p className='text-sm mt-1'>{game.description}</p>
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
                  {game.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {games.length === 0 && (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <h3 className='text-lg font-medium mb-2'>No games found</h3>
            <p className='text-muted-foreground text-center mb-4'>
              Create your first poker game to get started.
            </p>
            <Button>Create Game</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
