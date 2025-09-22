'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/types'

type Room = Tables<'rooms'>
type Game = Tables<'games'>
type _Table = Tables<'tables'>
type _WaitlistEntry = Tables<'waitlist_entries'>
type _PlayerSession = Tables<'player_sessions'>

interface GameWithStats extends Game {
  tables_open: number
  current_players: number
  waiting_count: number
  called_count: number
  checked_in_count: number
}

interface RoomWithGames extends Room {
  games: GameWithStats[]
}

interface UseRoomsDataReturn {
  rooms: RoomWithGames[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useRoomsData(): UseRoomsDataReturn {
  const [rooms, setRooms] = useState<RoomWithGames[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRoomsData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      // Fetch all active rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (roomsError) {
        throw roomsError
      }

      if (!roomsData) {
        setRooms([])
        return
      }

      // For each room, fetch games with their stats
      const roomsWithGames: RoomWithGames[] = await Promise.all(
        roomsData.map(async (room) => {
          // Fetch games for this room
          const { data: gamesData, error: gamesError } = await supabase
            .from('games')
            .select('*')
            .eq('room_id', room.id)
            .eq('is_active', true)
            .order('small_blind')

          if (gamesError) {
            console.error('Error fetching games for room:', room.id, gamesError)
            return { ...room, games: [] }
          }

          if (!gamesData) {
            return { ...room, games: [] }
          }

          // For each game, calculate stats
          const gamesWithStats: GameWithStats[] = await Promise.all(
            gamesData.map(async (game) => {
              // Count tables open for this game
              const { data: tablesData, error: _tablesError } = await supabase
                .from('tables')
                .select('id')
                .eq('game_id', game.id)
                .eq('status', 'open')

              const tables_open = tablesData?.length || 0

              // Count current players across all tables for this game
              const { data: playerSessionsData, error: _playerSessionsError } =
                await supabase
                  .from('player_sessions')
                  .select(
                    `
                  id,
                  table:tables!inner(
                    game_id
                  )
                `
                  )
                  .eq('table.game_id', game.id)
                  .is('end_time', null)

              const current_players = playerSessionsData?.length || 0

              // Count waitlist entries for this game
              const { data: waitlistData, error: waitlistError } =
                await supabase
                  .from('waitlist_entries')
                  .select('status')
                  .eq('game_id', game.id)

              if (waitlistError) {
                console.error(
                  'Error fetching waitlist for game:',
                  game.id,
                  waitlistError
                )
              }

              // Count waitlist entries (calledin + waiting + notified)
              const waiting_count =
                waitlistData?.filter(
                  (entry) =>
                    entry.status === 'waiting' ||
                    entry.status === 'calledin' ||
                    entry.status === 'notified'
                ).length || 0
              const called_count =
                waitlistData?.filter((entry) => entry.status === 'calledin')
                  .length || 0
              const checked_in_count =
                waitlistData?.filter((entry) => entry.status === 'waiting')
                  .length || 0

              return {
                ...game,
                tables_open,
                current_players,
                waiting_count,
                called_count,
                checked_in_count,
              }
            })
          )

          return {
            ...room,
            games: gamesWithStats,
          }
        })
      )

      setRooms(roomsWithGames)
    } catch (err) {
      console.error('Error fetching rooms data:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to fetch rooms data'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRoomsData()

    // Set up real-time subscriptions
    const supabase = createClient()
    const roomsSubscription = supabase
      .channel('rooms_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
        },
        () => {
          fetchRoomsData()
        }
      )
      .subscribe()

    const gamesSubscription = supabase
      .channel('games_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
        },
        () => {
          fetchRoomsData()
        }
      )
      .subscribe()

    const tablesSubscription = supabase
      .channel('tables_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
        },
        () => {
          fetchRoomsData()
        }
      )
      .subscribe()

    const playerSessionsSubscription = supabase
      .channel('player_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_sessions',
        },
        () => {
          fetchRoomsData()
        }
      )
      .subscribe()

    const waitlistSubscription = supabase
      .channel('waitlist_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waitlist_entries',
        },
        () => {
          fetchRoomsData()
        }
      )
      .subscribe()

    return (): void => {
      roomsSubscription.unsubscribe()
      gamesSubscription.unsubscribe()
      tablesSubscription.unsubscribe()
      playerSessionsSubscription.unsubscribe()
      waitlistSubscription.unsubscribe()
    }
  }, [fetchRoomsData])

  return {
    rooms,
    loading,
    error,
    refetch: fetchRoomsData,
  } as UseRoomsDataReturn
}
