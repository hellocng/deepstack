'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Phone, Users, CheckCircle } from 'lucide-react'

interface WaitlistEntry {
  id: string
  player_id: string | null
  game_id: string | null
  room_id: string | null
  status: 'waiting' | 'called' | 'seated' | 'cancelled' | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
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

interface WaitlistPlayerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: WaitlistEntry | null
  onEntryUpdated: (entry: WaitlistEntry) => void
  activeTables: TableSession[]
}

export function WaitlistPlayerDialog({
  open,
  onOpenChange,
  entry,
  onEntryUpdated,
  activeTables,
}: WaitlistPlayerDialogProps): JSX.Element {
  const [saving, setSaving] = useState(false)
  const [_selectedSeat, setSelectedSeat] = useState<number | null>(null)

  useEffect(() => {
    if (entry) {
      setSelectedSeat(null)
    }
  }, [entry])

  const handleStatusChange = async (newStatus: string): Promise<void> => {
    if (!entry) return

    setSaving(true)
    try {
      const supabase = createClient()

      const { data: updatedEntry, error } = await supabase
        .from('waitlist_entries')
        .update({
          status: newStatus as WaitlistEntry['status'],
          updated_at: new Date().toISOString(),
        })
        .eq('id', entry.id)
        .select(
          `
          *,
          player:players(id, alias, avatar_url),
          game:games(id, name, game_type, small_blind, big_blind)
        `
        )
        .single()

      if (error) {
        console.error('Error updating waitlist entry:', error)
        return
      }

      onEntryUpdated(updatedEntry)
    } catch (error) {
      console.error('Error updating waitlist entry:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAssignToTable = async (
    tableSessionId: string,
    seatNumber: number
  ): Promise<void> => {
    if (!entry) return

    setSaving(true)
    try {
      const supabase = createClient()

      // Create player session
      const { data: _playerSession, error: sessionError } = await supabase
        .from('player_sessions')
        .insert({
          table_session_id: tableSessionId,
          seat_number: seatNumber,
          player_id: entry.player_id,
          start_time: new Date().toISOString(),
        })
        .select()
        .single()

      if (sessionError) {
        console.error('Error creating player session:', sessionError)
        return
      }

      // Update waitlist entry to seated
      const { data: updatedEntry, error: waitlistError } = await supabase
        .from('waitlist_entries')
        .update({
          status: 'seated',
          updated_at: new Date().toISOString(),
        })
        .eq('id', entry.id)
        .select(
          `
          *,
          player:players(id, alias, avatar_url),
          game:games(id, name, game_type, small_blind, big_blind)
        `
        )
        .single()

      if (waitlistError) {
        console.error('Error updating waitlist entry:', waitlistError)
        return
      }

      onEntryUpdated(updatedEntry)
    } catch (error) {
      console.error('Error assigning to table:', error)
    } finally {
      setSaving(false)
    }
  }

  const getAvailableSeats = (tableSession: TableSession): number[] => {
    // This would need to be calculated based on existing player_sessions
    // For now, return all seats as available
    const seats: number[] = []
    for (let i = 1; i <= tableSession.table.seat_count; i++) {
      seats.push(i)
    }
    return seats
  }

  const getStatusActions = (): JSX.Element => {
    if (!entry) return <div />

    switch (entry.status || 'waiting') {
      case 'waiting':
        return (
          <div className='space-y-4'>
            <div className='flex items-center gap-2'>
              <Phone className='h-4 w-4 text-blue-500' />
              <span className='text-sm text-muted-foreground'>
                Player is waiting. Notify them about available seats.
              </span>
            </div>
            <Button
              onClick={() => handleStatusChange('called')}
              disabled={saving}
              className='w-full'
            >
              <Phone className='h-4 w-4 mr-2' />
              Notify Player
            </Button>
          </div>
        )

      case 'called':
        return (
          <div className='space-y-4'>
            <div className='flex items-center gap-2'>
              <CheckCircle className='h-4 w-4 text-green-500' />
              <span className='text-sm text-muted-foreground'>
                Player has been called. They can now be seated or marked as no
                show.
              </span>
            </div>

            {/* Available Tables for Assignment */}
            {activeTables.length > 0 && (
              <div className='space-y-3'>
                <Label>Assign to Table</Label>
                {activeTables.map((tableSession) => (
                  <div
                    key={tableSession.id}
                    className='space-y-2'
                  >
                    <div className='flex items-center justify-between p-3 border rounded-lg'>
                      <div>
                        <p className='font-medium'>{tableSession.table.name}</p>
                        <p className='text-sm text-muted-foreground'>
                          {tableSession.game.name}
                        </p>
                      </div>
                      <div className='flex gap-2'>
                        {getAvailableSeats(tableSession).map((seat) => (
                          <Button
                            key={seat}
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              handleAssignToTable(tableSession.id, seat)
                            }
                            disabled={saving}
                            className='w-8 h-8 p-0'
                          >
                            {seat}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className='flex gap-2'>
              <Button
                variant='outline'
                onClick={() => handleStatusChange('waiting')}
                disabled={saving}
                className='flex-1'
              >
                Back to Waiting
              </Button>
              <Button
                variant='destructive'
                onClick={() => handleStatusChange('cancelled')}
                disabled={saving}
                className='flex-1'
              >
                No Show
              </Button>
              <Button
                variant='destructive'
                onClick={() => handleStatusChange('cancelled')}
                disabled={saving}
                className='flex-1'
              >
                Cancel
              </Button>
            </div>
          </div>
        )

      case 'seated':
        return (
          <div className='space-y-4'>
            <div className='flex items-center gap-2'>
              <Users className='h-4 w-4 text-green-500' />
              <span className='text-sm text-muted-foreground'>
                Player is seated at a table.
              </span>
            </div>
            <Button
              variant='outline'
              onClick={() => handleStatusChange('called')}
              disabled={saving}
              className='w-full'
            >
              Move Back to Notified
            </Button>
          </div>
        )

      default:
        return <div />
    }
  }

  if (!entry) return <div />

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            Manage Player: {entry.player?.alias || 'Unknown Player'}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Player Info */}
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label>Player</Label>
              <div className='p-3 border rounded-lg'>
                <p className='font-medium'>
                  {entry.player?.alias || 'Unknown Player'}
                </p>
              </div>
            </div>
            <div className='space-y-2'>
              <Label>Game</Label>
              <div className='p-3 border rounded-lg'>
                <p className='font-medium'>
                  {entry.game?.name || 'Unknown Game'}
                </p>
                <p className='text-sm text-muted-foreground'>
                  ${entry.game?.small_blind || 0}/${entry.game?.big_blind || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className='space-y-2'>
            <Label>Current Status</Label>
            <div className='flex items-center gap-2'>
              <Badge
                variant={
                  (entry.status || 'waiting') === 'waiting'
                    ? 'secondary'
                    : (entry.status || 'waiting') === 'called'
                      ? 'default'
                      : (entry.status || 'waiting') === 'seated'
                        ? 'outline'
                        : 'destructive'
                }
              >
                {(entry.status || 'waiting').charAt(0).toUpperCase() +
                  (entry.status || 'waiting').slice(1)}
              </Badge>
              {(entry.status || 'waiting') === 'called' && (
                <Phone className='h-4 w-4 text-blue-500' />
              )}
            </div>
          </div>

          {/* Actions */}
          {getStatusActions()}

          {/* Close Button */}
          <div className='flex gap-4 pt-4 justify-end'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
