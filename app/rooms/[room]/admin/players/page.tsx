'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOperator } from '@/lib/auth/user-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, Clock, MapPin, DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components/ui/loading'
import { toast } from 'sonner'
import Image from 'next/image'

interface PlayerSession {
  id: string
  player_id: string | null
  seat_number: number
  start_time: string | null
  end_time: string | null
  table_session_id: string | null
  created_at: string | null
  updated_at: string | null
  player: {
    id: string
    alias: string | null
    avatar_url: string | null
  } | null
  table_session: {
    id: string
    table_id: string
    game_id: string
    room_id: string
    start_time: string
    end_time: string | null
    table: {
      id: string
      name: string
      seat_count: number
      is_active: boolean
    } | null
    game: {
      id: string
      name: string
      game_type: string
      small_blind: number
      big_blind: number
    } | null
  } | null
}

export default function PlayersPage(): JSX.Element {
  const [loading, setLoading] = useState(true)
  const [playerSessions, setPlayerSessions] = useState<PlayerSession[]>([])
  const operator = useOperator()
  const router = useRouter()

  useEffect(() => {
    const fetchPlayerSessions = async (): Promise<void> => {
      if (!operator?.profile?.room_id) return

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('player_sessions')
          .select(
            `
            *,
            player:players(id, alias, avatar_url),
            table_session:table_sessions(
              id,
              table_id,
              game_id,
              room_id,
              start_time,
              end_time,
              table:tables(id, name, seat_count, is_active),
              game:games(id, name, game_type, small_blind, big_blind)
            )
          `
          )
          .eq('table_session.room_id', operator.profile.room_id)
          .is('end_time', null)
          .order('start_time', { ascending: false })

        if (error) {
          console.error('Error fetching player sessions:', error)
          toast.error('Failed to load player sessions')
          return
        }

        setPlayerSessions(data || [])
      } catch (error) {
        console.error('Error fetching player sessions:', error)
        toast.error(
          'An unexpected error occurred while loading player sessions'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchPlayerSessions()
  }, [operator])

  const formatDuration = (startTime: string | null): string => {
    if (!startTime) return 'Unknown'

    const start = new Date(startTime)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`
    }
    return `${diffMinutes}m`
  }

  const getGameTypeBadge = (gameType: string | null): JSX.Element => {
    const variants: Record<
      string,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
      texas_holdem: 'default',
      omaha: 'secondary',
      seven_card_stud: 'outline',
      five_card_draw: 'outline',
      razr: 'destructive',
      stud_hi_lo: 'secondary',
    }

    const labels: Record<string, string> = {
      texas_holdem: "Hold'em",
      omaha: 'Omaha',
      seven_card_stud: '7-Card Stud',
      five_card_draw: '5-Card Draw',
      razr: 'Razz',
      stud_hi_lo: 'Stud Hi/Lo',
    }

    return (
      <Badge variant={variants[gameType || ''] || 'outline'}>
        {labels[gameType || ''] || gameType}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loading
          size='md'
          text='Loading active players...'
        />
      </div>
    )
  }

  // Check if user is authenticated as an operator with appropriate role
  if (!operator || !['admin', 'supervisor'].includes(operator.profile.role)) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center'>
          <h2 className='text-xl font-semibold mb-2'>Access Denied</h2>
          <p className='text-muted-foreground mb-4'>
            You must be logged in as a room administrator or supervisor to
            access player information.
          </p>
          <Button onClick={() => router.push('/')}>Go to Home</Button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8'
          onClick={() => router.back()}
        >
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Active Players</h1>
          <p className='text-muted-foreground'>
            View all players currently seated at tables
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Active Players
            </CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{playerSessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Active Tables</CardTitle>
            <MapPin className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {
                new Set(
                  playerSessions.map(
                    (session) => session.table_session?.table_id
                  )
                ).size
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Active Games</CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {
                new Set(
                  playerSessions.map(
                    (session) => session.table_session?.game_id
                  )
                ).size
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Player Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Users className='h-5 w-5' />
            Active Player Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {playerSessions.length > 0 ? (
            <div className='space-y-4'>
              {playerSessions.map((session) => (
                <div
                  key={session.id}
                  className='flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors'
                >
                  <div className='flex items-center gap-4'>
                    {/* Player Avatar */}
                    <div className='w-10 h-10 rounded-full bg-muted flex items-center justify-center'>
                      {session.player?.avatar_url ? (
                        <Image
                          src={session.player.avatar_url}
                          alt={session.player.alias || 'Player'}
                          width={40}
                          height={40}
                          className='w-10 h-10 rounded-full object-cover'
                        />
                      ) : (
                        <Users className='h-5 w-5 text-muted-foreground' />
                      )}
                    </div>

                    {/* Player Info */}
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>
                          {session.player?.alias || 'Unknown Player'}
                        </span>
                        <Badge variant='outline'>
                          Seat {session.seat_number}
                        </Badge>
                      </div>
                      <div className='text-sm text-muted-foreground'>
                        {session.table_session?.table?.name || 'Unknown Table'}{' '}
                        • {session.table_session?.game?.name || 'Unknown Game'}
                      </div>
                    </div>
                  </div>

                  {/* Game Info */}
                  <div className='flex items-center gap-3'>
                    <div className='text-right space-y-1'>
                      <div className='flex items-center gap-2'>
                        {getGameTypeBadge(
                          session.table_session?.game?.game_type || null
                        )}
                        <Badge variant='secondary'>
                          ${session.table_session?.game?.small_blind}/$
                          {session.table_session?.game?.big_blind}
                        </Badge>
                      </div>
                      <div className='flex items-center gap-1 text-sm text-muted-foreground'>
                        <Clock className='h-3 w-3' />
                        {formatDuration(session.start_time)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-center py-8 text-muted-foreground'>
              <Users className='h-12 w-12 mx-auto mb-4 opacity-50' />
              <h3 className='text-lg font-medium mb-2'>No Active Players</h3>
              <p>There are currently no players seated at any tables.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
