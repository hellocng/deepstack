'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from 'lucide-react'
import { PlayerAssignmentDialog } from './player-assignment-dialog'
import type { Database } from '@/types/database'

type PlayerSession = Database['public']['Tables']['player_sessions']['Row'] & {
  player: {
    id: string
    alias: string | null
    avatar_url: string | null
  } | null
}

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

interface TableSession {
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
  }
  game: {
    id: string
    name: string
    game_type: string
  }
}

interface TableLayoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableSession: TableSession | null
  waitlistEntries: WaitlistEntry[]
  onPlayerAssigned?: (playerSession: PlayerSession) => void
}

export function TableLayoutDialog({
  open,
  onOpenChange,
  tableSession,
  waitlistEntries,
  onPlayerAssigned: _onPlayerAssigned,
}: TableLayoutDialogProps): JSX.Element {
  const [playerSessions, setPlayerSessions] = useState<PlayerSession[]>([])
  const [_loading, setLoading] = useState(false)
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<number | null>(
    null
  )

  // Fetch player sessions for this table
  useEffect(() => {
    if (!tableSession || !open) return

    const fetchPlayerSessions = async (): Promise<void> => {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('player_sessions')
          .select(
            `
            *,
            player:players(id, alias, avatar_url)
          `
          )
          .eq('table_session_id', tableSession.id)
          .is('end_time', null)
          .order('seat_number', { ascending: true })

        if (error) {
          console.error('Error fetching player sessions:', error)
          return
        }

        setPlayerSessions(data || [])
      } catch (error) {
        console.error('Error fetching player sessions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayerSessions()
  }, [tableSession, open])

  // Real-time updates for player sessions
  useEffect(() => {
    if (!tableSession || !open) return

    const supabase = createClient()
    const subscription = supabase
      .channel(`player-sessions-${tableSession.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_sessions',
          filter: `table_session_id=eq.${tableSession.id}`,
        },
        () => {
          // Refetch player sessions when any change occurs
          const fetchPlayerSessions = async (): Promise<void> => {
            try {
              const { data, error } = await supabase
                .from('player_sessions')
                .select(
                  `
                  *,
                  player:players(id, alias, avatar_url)
                `
                )
                .eq('table_session_id', tableSession.id)
                .is('end_time', null)
                .order('seat_number', { ascending: true })

              if (error) {
                console.error('Error fetching player sessions:', error)
                return
              }

              setPlayerSessions(data || [])
            } catch (error) {
              console.error('Error fetching player sessions:', error)
            }
          }
          fetchPlayerSessions()
        }
      )
      .subscribe()

    return (): void => {
      subscription.unsubscribe()
    }
  }, [tableSession, open])

  const getSeatPosition = (
    seatNumber: number,
    totalSeats: number
  ): { x: number; y: number } => {
    // Seat 1 starts at 7 o'clock (210°) and goes clockwise around the table
    // Last seat ends at 5 o'clock (150°)
    // Seats are positioned around the OUTSIDE of the poker table outline
    if (totalSeats <= 1) {
      return { x: 0.5, y: 0.85 }
    }

    const startAngle = 210 // 7 o'clock in degrees
    const seatIndex = seatNumber - 1

    // Calculate angle for this seat going clockwise around the table
    let currentAngle: number

    if (totalSeats === 1) {
      currentAngle = startAngle
    } else {
      // Going clockwise from 7 o'clock to 5 o'clock
      const totalArc = 300
      const angleStep = totalArc / (totalSeats - 1)
      currentAngle = startAngle + angleStep * seatIndex

      // Normalize angle to 0-360 range
      if (currentAngle >= 360) {
        currentAngle -= 360
      }
    }

    // Convert to radians for Math functions (0° is at 3 o'clock, going counter-clockwise)
    const angleRadians = ((90 - currentAngle) * Math.PI) / 180

    // Table outline dimensions (inner table) - elliptical to match the actual table shape
    const tableRadiusX = 0.35 // Horizontal radius (wider)
    const tableRadiusY = 0.35 // Vertical radius (same as horizontal for circular table)

    // Seat offset from table edge (how far outside the table the seats are)
    const seatOffset = 0.06 // Distance from table edge to seat center

    // Calculate seat position outside the table outline with elliptical positioning
    const seatRadiusX = tableRadiusX + seatOffset
    const seatRadiusY = tableRadiusY + seatOffset

    return {
      x: 0.5 + seatRadiusX * Math.cos(angleRadians),
      y: 0.5 - seatRadiusY * Math.sin(angleRadians),
    }
  }

  const getPlayerAtSeat = (seatNumber: number): PlayerSession | null => {
    return playerSessions.find((ps) => ps.seat_number === seatNumber) || null
  }

  const getAvailableWaitlistEntries = (): WaitlistEntry[] => {
    if (!tableSession) return []
    return waitlistEntries.filter(
      (entry) => entry.game_id === tableSession.game_id
    )
  }

  const handleSeatClick = async (seatNumber: number): Promise<void> => {
    const playerAtSeat = getPlayerAtSeat(seatNumber)
    if (playerAtSeat) {
      // Seat is occupied, could show player details or remove player
      return
    }

    // Seat is empty, open player assignment dialog
    setSelectedSeatNumber(seatNumber)
    setAssignmentDialogOpen(true)
  }

  const handlePlayerAssigned = (): void => {
    // Refetch player sessions to update the display
    if (!tableSession) return

    const fetchPlayerSessions = async (): Promise<void> => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('player_sessions')
          .select(
            `
            *,
            player:players(id, alias, avatar_url)
          `
          )
          .eq('table_session_id', tableSession.id)
          .is('end_time', null)
          .order('seat_number', { ascending: true })

        if (error) {
          console.error('Error fetching player sessions:', error)
          return
        }

        setPlayerSessions(data || [])
      } catch (error) {
        console.error('Error fetching player sessions:', error)
      }
    }
    fetchPlayerSessions()
  }

  if (!tableSession) return <></>

  const totalSeats = tableSession.table.seat_count
  const availableWaitlistEntries = getAvailableWaitlistEntries()

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6'>
        <DialogHeader className='mb-4 sm:mb-6'>
          <DialogTitle className='text-lg sm:text-xl'>
            {tableSession.table.name} - {tableSession.game.name}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-6 sm:space-y-8'>
          {/* Table Layout Container with proper spacing */}
          <div className='flex justify-center p-4 sm:p-8'>
            <div className='relative h-[16rem] sm:h-[20rem] w-[24rem] sm:w-[32rem] max-w-full'>
              {/* Table Outline - Circular Poker Table - No Fill */}
              <div className='absolute top-[15%] left-[15%] right-[15%] bottom-[15%] rounded-full border-4 border-green-800 bg-transparent'></div>

              {/* Dealer Position - Below the table at 6 o'clock */}
              <div className='absolute top-[85%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1'>
                <div className='w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg'>
                  D
                </div>
                <div className='text-xs text-center font-medium'>Dealer</div>
              </div>

              {/* Seats */}
              {Array.from({ length: totalSeats }, (_, i) => i + 1).map(
                (seatNumber) => {
                  const position = getSeatPosition(seatNumber, totalSeats)
                  const player = getPlayerAtSeat(seatNumber)
                  const isOccupied = !!player

                  return (
                    <div
                      key={seatNumber}
                      className='absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer'
                      style={{
                        left: `${position.x * 100}%`,
                        top: `${position.y * 100}%`,
                      }}
                      onClick={() => handleSeatClick(seatNumber)}
                    >
                      <div
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center transition-colors shadow-lg ${
                          isOccupied
                            ? 'bg-blue-500 border-blue-700 text-white'
                            : 'bg-white border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {isOccupied ? (
                          <>
                            <Avatar className='w-5 h-5 sm:w-6 sm:h-6'>
                              <AvatarImage
                                src={player.player?.avatar_url || ''}
                              />
                              <AvatarFallback className='text-xs'>
                                {player.player?.alias?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className='text-xs font-medium mt-1 truncate max-w-[3rem]'>
                              {player.player?.alias || 'Unknown'}
                            </div>
                          </>
                        ) : (
                          <>
                            <User className='w-3 h-3 sm:w-4 sm:h-4 text-gray-500' />
                            <div className='text-xs font-medium text-gray-500 mt-1'>
                              {seatNumber}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          </div>

          {/* Table Info */}
          <div className='flex justify-center'>
            <div className='space-y-3'>
              <h3 className='font-semibold text-lg text-center'>
                Table Information
              </h3>
              <div className='text-sm text-muted-foreground space-y-2'>
                <div className='flex justify-between'>
                  <span>Started:</span>
                  <span className='font-medium'>
                    {new Date(tableSession.start_time).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      <PlayerAssignmentDialog
        open={assignmentDialogOpen}
        onOpenChange={setAssignmentDialogOpen}
        tableSessionId={tableSession.id}
        seatNumber={selectedSeatNumber || 1}
        waitlistEntries={availableWaitlistEntries}
        onPlayerAssigned={handlePlayerAssigned}
      />
    </Dialog>
  )
}
