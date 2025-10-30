'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Phone, Users, CheckCircle, UserCheck, Table } from 'lucide-react'
import { type WaitlistStatus } from '@/lib/waitlist-status-utils'
import { TableLayoutDialog } from './table-layout-dialog'
import type { Database } from '@/types/database'

type WaitlistEntry = Database['public']['Tables']['waitlist_entries']['Row'] & {
  player: {
    id: string
    alias: string | null
    avatar_url: string | null
    phone_number?: string | null
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
  const [aliasValue, setAliasValue] = useState('')
  const [phoneValue, setPhoneValue] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [tableLayoutOpen, setTableLayoutOpen] = useState(false)
  const [selectedTableSession, setSelectedTableSession] =
    useState<TableSession | null>(null)

  useEffect(() => {
    if (entry) {
      setSelectedSeat(null)
      setAliasValue(entry.player?.alias || '')
      // Phone number will be fetched from auth user data
      setPhoneValue(entry.player?.phone_number || '')
      setHasChanges(false)
    }
  }, [entry])

  useEffect(() => {
    if (entry) {
      const aliasChanged = aliasValue !== (entry.player?.alias || '')
      // For phone, we'll consider it changed if it's not empty (since we start with empty)
      const phoneChanged = phoneValue !== (entry.player?.phone_number || '')
      setHasChanges(aliasChanged || phoneChanged)
    }
  }, [aliasValue, phoneValue, entry])

  const handlePlayerUpdate = async (): Promise<void> => {
    if (!entry?.player?.id) return

    setSaving(true)
    try {
      const supabase = createClient()

      // Update player alias in players table
      if (aliasValue !== (entry.player?.alias || '')) {
        const { error: playerError } = await supabase
          .from('players')
          .update({ alias: aliasValue })
          .eq('id', entry.player.id)

        if (playerError) {
          console.error('Error updating player alias:', playerError)
          return
        }
      }

      // Update phone number in auth.users table
      if (phoneValue.trim() !== '') {
        // Check if player has an auth user linked
        const { data: playerData, error: playerFetchError } = await supabase
          .from('players')
          .select('auth_id')
          .eq('id', entry.player.id)
          .single()

        if (playerFetchError) {
          console.error('Error fetching player data:', playerFetchError)
          return
        }

        if (playerData?.auth_id) {
          // Player has an auth user, update the phone
          const { error: authError } = await supabase.auth.updateUser({
            data: { phone: phoneValue },
          })

          if (authError) {
            console.error('Error updating phone number:', authError)
            return
          }
        } else {
          // Player doesn't have an auth user, create one
          const { data: authData, error: authError } =
            await supabase.auth.admin.createUser({
              phone: phoneValue,
              user_metadata: {
                player_id: entry.player.id,
              },
            })

          if (authError) {
            console.error('Error creating auth user:', authError)
            return
          }

          // Link the auth user to the player
          const { error: linkError } = await supabase
            .from('players')
            .update({ auth_id: authData.user.id })
            .eq('id', entry.player.id)

          if (linkError) {
            console.error('Error linking auth user to player:', linkError)
            return
          }
        }
      }

      // Update the entry with the new values
      const updatedEntry = {
        ...entry,
        player: {
          ...entry.player,
          alias: aliasValue,
          phone_number: phoneValue || entry.player?.phone_number || null,
        },
      }

      onEntryUpdated(updatedEntry)
      setHasChanges(false)
    } catch (error) {
      console.error('Error updating player:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (
    newStatus: WaitlistStatus
  ): Promise<void> => {
    if (!entry) return

    setSaving(true)
    try {
      const supabase = createClient()
      const now = new Date().toISOString()

      const updateData: {
        status: WaitlistStatus
        updated_at: string
        notified_at?: string
        cancelled_at?: string
        cancelled_by?: 'player' | 'staff' | 'system' | null
      } = {
        status: newStatus,
        updated_at: now,
      }

      // Set appropriate timestamps based on status
      if (newStatus === 'calledin') {
        // For 'calledin' status, we don't set notified_at
        // The countdown starts from created_at timestamp
      } else if (newStatus === 'notified') {
        // Set notified_at when player checks in (moves to notified status)
        updateData.notified_at = now
      } else if (newStatus === 'cancelled') {
        updateData.cancelled_at = now
        updateData.cancelled_by = 'staff'
      }

      const { data: updatedEntry, error } = await supabase
        .from('waitlist_entries')
        .update(updateData)
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

  const getCompatibleTables = (): TableSession[] => {
    if (!entry) return []
    return activeTables.filter(
      (tableSession) => tableSession.game_id === entry.game_id
    )
  }

  const handleOpenTableLayout = (tableSession: TableSession): void => {
    setSelectedTableSession(tableSession)
    setTableLayoutOpen(true)
  }

  const handleSeatAssigned = async (): Promise<void> => {
    // Refetch the entry to get updated status
    if (!entry) return

    try {
      const supabase = createClient()
      const { data: updatedEntry, error } = await supabase
        .from('waitlist_entries')
        .select(
          `
          *,
          player:players(id, alias, avatar_url),
          game:games(id, name, game_type, small_blind, big_blind)
        `
        )
        .eq('id', entry.id)
        .single()

      if (error) {
        console.error('Error fetching updated entry:', error)
        return
      }

      if (updatedEntry) {
        onEntryUpdated(updatedEntry)
      }
    } catch (error) {
      console.error('Error fetching updated entry:', error)
    }

    setTableLayoutOpen(false)
    setSelectedTableSession(null)
  }

  const getStatusActions = (): JSX.Element => {
    if (!entry) return <div />

    switch (entry.status || 'calledin') {
      case 'calledin':
        return (
          <div className='space-y-4'>
            <div className='flex items-center gap-2'>
              <CheckCircle className='h-4 w-4 text-green-500' />
              <span className='text-sm text-muted-foreground'>
                Player has been called in. They have 90 minutes to check in.
              </span>
            </div>
            <Button
              onClick={() => handleStatusChange('notified')}
              disabled={saving}
              className='w-full'
            >
              <CheckCircle className='h-4 w-4 mr-2' />
              Check In Player
            </Button>

            {/* Assign Seat Button */}
            {getCompatibleTables().length > 0 && (
              <Button
                variant='outline'
                onClick={() => {
                  const compatibleTables = getCompatibleTables()
                  if (compatibleTables.length === 1) {
                    handleOpenTableLayout(compatibleTables[0])
                  } else if (compatibleTables.length > 1) {
                    // If multiple tables, open first one (could be improved with table selection)
                    handleOpenTableLayout(compatibleTables[0])
                  }
                }}
                disabled={saving}
                className='w-full'
              >
                <Table className='h-4 w-4 mr-2' />
                Assign Seat
              </Button>
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
                Cancel
              </Button>
            </div>
          </div>
        )

      case 'notified':
        return (
          <div className='space-y-4'>
            <div className='flex items-center gap-2'>
              <UserCheck className='h-4 w-4 text-blue-500' />
              <span className='text-sm text-muted-foreground'>
                Player has been notified. They have 5 minutes to respond.
              </span>
            </div>

            {/* Assign Seat Button */}
            {getCompatibleTables().length > 0 && (
              <Button
                onClick={() => {
                  const compatibleTables = getCompatibleTables()
                  if (compatibleTables.length === 1) {
                    handleOpenTableLayout(compatibleTables[0])
                  } else if (compatibleTables.length > 1) {
                    // If multiple tables, open first one (could be improved with table selection)
                    handleOpenTableLayout(compatibleTables[0])
                  }
                }}
                disabled={saving}
                className='w-full'
              >
                <Table className='h-4 w-4 mr-2' />
                Assign Seat
              </Button>
            )}

            {/* Available Tables for Assignment */}
            {activeTables.length > 0 && (
              <div className='space-y-3'>
                <Label>Or Assign to Table Directly</Label>
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
              onClick={() => handleStatusChange('calledin')}
              disabled={saving}
              className='w-full'
            >
              Move Back to Called In
            </Button>
          </div>
        )

      default:
        return <div />
    }
  }

  if (!entry) return <div />

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
      >
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader className='sr-only'>
            <DialogTitle>
              Manage Player: {entry.player?.alias || 'Unknown Player'}
            </DialogTitle>
            <DialogDescription>
              Manage waitlist status and assign player to available tables.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            {/* Player Info */}
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label>Player Alias</Label>
                <Input
                  value={aliasValue}
                  onChange={(e) => setAliasValue(e.target.value)}
                  placeholder='Enter player alias'
                  disabled={saving}
                />
              </div>
              <div className='space-y-2'>
                <Label>Phone Number</Label>
                <Input
                  value={phoneValue}
                  onChange={(e) => setPhoneValue(e.target.value)}
                  placeholder='Enter phone number'
                  disabled={saving}
                />
              </div>
            </div>

            {/* Status and Game */}
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label>Status</Label>
                <div className='flex items-center gap-2 h-10'>
                  <Badge
                    variant={
                      (entry.status || 'calledin') === 'calledin'
                        ? 'secondary'
                        : (entry.status || 'calledin') === 'waiting'
                          ? 'outline'
                          : (entry.status || 'calledin') === 'notified'
                            ? 'default'
                            : (entry.status || 'calledin') === 'seated'
                              ? 'outline'
                              : (entry.status || 'calledin') === 'cancelled'
                                ? 'destructive'
                                : (entry.status || 'calledin') === 'expired'
                                  ? 'destructive'
                                  : 'secondary'
                    }
                  >
                    {(entry.status || 'calledin') === 'calledin'
                      ? 'Called In'
                      : (entry.status || 'calledin') === 'waiting'
                        ? 'Waiting'
                        : (entry.status || 'calledin') === 'notified'
                          ? 'Notified'
                          : (entry.status || 'calledin') === 'seated'
                            ? 'Seated'
                            : (entry.status || 'calledin') === 'cancelled'
                              ? 'Cancelled'
                              : (entry.status || 'calledin') === 'expired'
                                ? 'Expired'
                                : 'Called In'}
                  </Badge>
                  {(entry.status || 'calledin') === 'calledin' && (
                    <Phone className='h-4 w-4 text-blue-500' />
                  )}
                  {(entry.status || 'calledin') === 'notified' && (
                    <Phone className='h-4 w-4 text-red-500' />
                  )}
                </div>
              </div>
              <div className='space-y-2'>
                <Label>Game</Label>
                <Input
                  value={entry.game?.name || 'Unknown Game'}
                  disabled
                  className='text-muted-foreground'
                />
              </div>
            </div>

            {/* Actions */}
            {getStatusActions()}

            {/* Close Button */}
            <div className='flex gap-4 pt-4 justify-end'>
              {hasChanges && (
                <Button
                  type='button'
                  onClick={handlePlayerUpdate}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
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

      {/* Table Layout Dialog for Seat Assignment */}
      {selectedTableSession && entry && (
        <TableLayoutDialog
          open={tableLayoutOpen}
          onOpenChange={(open): void => {
            setTableLayoutOpen(open)
            if (!open) {
              setSelectedTableSession(null)
            }
          }}
          tableSession={selectedTableSession}
          waitlistEntries={[entry]}
          onPlayerAssigned={handleSeatAssigned}
        />
      )}
    </>
  )
}
