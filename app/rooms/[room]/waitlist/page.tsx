'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePlayer } from '@/lib/auth/user-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loading } from '@/components/ui/loading'
import { WaitlistGameCard } from '@/components/player/waitlist-game-card'
import { WaitlistStatusCard } from '@/components/player/waitlist-status-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, RefreshCw, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database'

type Game = Database['public']['Tables']['games']['Row']
type Room = Database['public']['Tables']['rooms']['Row']

interface GameWithWaitlistCount extends Game {
  waitlistCount: number
  estimatedWaitTime?: number
}

export default function PlayerWaitlistPage(): JSX.Element {
  const params = useParams()
  const router = useRouter()
  const player = usePlayer()
  const [room, setRoom] = useState<Room | null>(null)
  const [games, setGames] = useState<GameWithWaitlistCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alias, setAlias] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedGames, setSelectedGames] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const roomId = params.room as string

  const handlePhoneLookup = async (phoneNumber: string): Promise<void> => {
    if (!phoneNumber.trim()) return

    try {
      const supabase = createClient()

      // Look for existing player by phone in auth users
      const { data: authUsers, error: authError } =
        await supabase.auth.admin.listUsers()

      if (authError) {
        console.error('Error looking up phone:', authError)
        return
      }

      // Find user with matching phone
      const userWithPhone = authUsers.users.find(
        (user) =>
          user.user_metadata?.phone === phoneNumber ||
          user.phone === phoneNumber
      )

      if (userWithPhone) {
        // Find the player record linked to this auth user
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select('alias')
          .eq('auth_id', userWithPhone.id)
          .single()

        if (playerError) {
          console.error('Error fetching player data:', playerError)
          return
        }

        if (playerData?.alias) {
          setAlias(playerData.alias)
        }
      }
    } catch (error) {
      console.error('Error during phone lookup:', error)
    }
  }

  const handleSubmit = async (): Promise<void> => {
    if (selectedGames.length === 0) {
      setError('Please select at least one game')
      return
    }

    if (!alias.trim()) {
      setError('Please enter an alias')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()

      // Create or find player
      let playerId: string

      if (phone.trim()) {
        // Look for existing player by phone
        const { data: authUsers, error: authError } =
          await supabase.auth.admin.listUsers()

        if (authError) {
          throw new Error('Failed to lookup existing user')
        }

        const userWithPhone = authUsers.users.find(
          (user) => user.user_metadata?.phone === phone || user.phone === phone
        )

        if (userWithPhone) {
          // Find existing player
          const { data: existingPlayer, error: playerError } = await supabase
            .from('players')
            .select('id, phone_number')
            .eq('auth_id', userWithPhone.id)
            .single()

          if (playerError || !existingPlayer) {
            throw new Error('Failed to find existing player')
          }

          playerId = existingPlayer.id

          // Update alias if changed
          if (
            alias !== userWithPhone.user_metadata?.alias ||
            existingPlayer.phone_number !== (phone || null)
          ) {
            await supabase
              .from('players')
              .update({ alias, phone_number: phone || null })
              .eq('id', playerId)
          }
        } else {
          // Create new auth user and player
          const { data: authData, error: authError } =
            await supabase.auth.admin.createUser({
              phone: phone,
              user_metadata: { alias },
            })

          if (authError) {
            throw new Error('Failed to create user')
          }

          const { data: newPlayer, error: playerError } = await supabase
            .from('players')
            .insert({
              auth_id: authData.user.id,
              alias,
              phone_number: phone,
            })
            .select('id')
            .single()

          if (playerError || !newPlayer) {
            throw new Error('Failed to create player')
          }

          playerId = newPlayer.id
        }
      } else {
        // Create player without auth user
        const { data: newPlayer, error: playerError } = await supabase
          .from('players')
          .insert({ alias, phone_number: null })
          .select('id')
          .single()

        if (playerError || !newPlayer) {
          throw new Error('Failed to create player')
        }

        playerId = newPlayer.id
      }

      // Create waitlist entries for each selected game
      const waitlistEntries = selectedGames.map((gameId) => ({
        player_id: playerId,
        game_id: gameId,
        room_id: roomId,
        status: 'calledin' as const,
        notes: notes.trim() || null,
      }))

      const { error: waitlistError } = await supabase
        .from('waitlist_entries')
        .insert(waitlistEntries)

      if (waitlistError) {
        throw new Error('Failed to join waitlist')
      }

      // Reset form
      setAlias('')
      setPhone('')
      setSelectedGames([])
      setNotes('')

      // Refresh data
      await fetchRoomAndGames()
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to join waitlist'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const fetchRoomAndGames = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()

      // Fetch room details
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (roomError || !roomData) {
        throw new Error('Room not found')
      }

      setRoom(roomData)

      // Fetch active games
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_active', true)
        .order('name')

      if (gamesError) {
        throw new Error('Failed to fetch games')
      }

      // Fetch waitlist counts for each game
      const gamesWithCounts = await Promise.all(
        (gamesData || []).map(async (game) => {
          const { count } = await supabase
            .from('waitlist_entries')
            .select('*', { count: 'exact', head: true })
            .eq('game_id', game.id)
            .in('status', ['waiting', 'calledin', 'notified'])

          // Simple estimation: 15 minutes per person in line
          const estimatedWaitTime = count ? count * 15 : 0

          return {
            ...game,
            waitlistCount: count || 0,
            estimatedWaitTime,
          }
        })
      )

      setGames(gamesWithCounts)
    } catch (err) {
      console.error('Error fetching room and games:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [roomId])

  const handleJoined = (): void => {
    void fetchRoomAndGames()
  }

  useEffect(() => {
    fetchRoomAndGames()
  }, [fetchRoomAndGames])

  if (loading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='flex items-center justify-center h-64'>
          <Loading
            size='lg'
            text='Loading waitlist...'
          />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-600 mb-4'>Error</h1>
          <p className='text-muted-foreground mb-4'>{error}</p>
          <Button onClick={fetchRoomAndGames}>
            <RefreshCw className='h-4 w-4 mr-2' />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold mb-4'>Room Not Found</h1>
          <p className='text-muted-foreground mb-4'>
            The room you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button onClick={(): void => router.back()}>
            <ArrowLeft className='h-4 w-4 mr-2' />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='container mx-auto px-4 py-8 space-y-8'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>{room.name} Waitlist</h1>
          <p className='text-muted-foreground'>
            Join the waitlist for your favorite poker games
          </p>
        </div>
        <Button
          variant='outline'
          onClick={(): void => router.back()}
        >
          <ArrowLeft className='h-4 w-4 mr-2' />
          Back
        </Button>
      </div>

      {/* Player's Current Waitlist Status */}
      {player && (
        <WaitlistStatusCard
          roomId={roomId}
          playerId={player.profile.id}
        />
      )}

      {/* Join Waitlist Form */}
      <Card>
        <CardHeader>
          <CardTitle>Join Waitlist</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Player Info */}
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='phone'>Phone Number</Label>
              <Input
                id='phone'
                type='tel'
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  handlePhoneLookup(e.target.value)
                }}
                placeholder='Enter phone number'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='alias'>Player Alias</Label>
              <Input
                id='alias'
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder='Enter player alias'
                required
              />
            </div>
          </div>

          {/* Game Selection */}
          <div className='space-y-2'>
            <Label>Select Games</Label>
            <div className='grid gap-2 md:grid-cols-2'>
              {games.map((game) => (
                <div
                  key={game.id}
                  className='flex items-center space-x-2'
                >
                  <Checkbox
                    id={game.id}
                    checked={selectedGames.includes(game.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedGames([...selectedGames, game.id])
                      } else {
                        setSelectedGames(
                          selectedGames.filter((id) => id !== game.id)
                        )
                      }
                    }}
                  />
                  <Label
                    htmlFor={game.id}
                    className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                  >
                    {game.name} - ${game.small_blind}/${game.big_blind}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className='space-y-2'>
            <Label htmlFor='notes'>Notes (Optional)</Label>
            <Textarea
              id='notes'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='Any special requests or notes...'
              rows={3}
            />
          </div>

          {/* Error Message */}
          {error && <div className='text-red-600 text-sm'>{error}</div>}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedGames.length === 0 || !alias.trim()}
            className='w-full'
          >
            {submitting ? 'Joining Waitlist...' : 'Join Waitlist'}
          </Button>
        </CardContent>
      </Card>

      {/* Available Games */}
      <div className='space-y-6'>
        <h2 className='text-2xl font-semibold'>Available Games</h2>

        {games.length === 0 ? (
          <Card>
            <CardContent className='p-8 text-center'>
              <Users className='h-12 w-12 mx-auto mb-4 text-muted-foreground' />
              <h3 className='text-lg font-medium mb-2'>No Active Games</h3>
              <p className='text-muted-foreground'>
                There are currently no active games at this room.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {games.map((game) => (
              <WaitlistGameCard
                key={game.id}
                game={game}
                room={room}
                waitlistCount={game.waitlistCount}
                estimatedWaitTime={game.estimatedWaitTime}
                onJoined={handleJoined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
