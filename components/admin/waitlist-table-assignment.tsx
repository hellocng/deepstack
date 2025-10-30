'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table as TableIcon,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { WaitlistStatusManager } from '@/lib/waitlist-status-manager'
import type { Database } from '@/types/database'
import { WaitlistTableIntegration } from '@/lib/waitlist-table-integration'

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

type Table = Database['public']['Tables']['tables']['Row'] & {
  available_seats: number
  current_players: number
  game_id: string
}

interface WaitlistTableAssignmentProps {
  entry: WaitlistEntry
  tables: Table[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssignmentComplete: () => void
}

export function WaitlistTableAssignment({
  entry,
  tables,
  open,
  onOpenChange,
  onAssignmentComplete,
}: WaitlistTableAssignmentProps): JSX.Element {
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [cancelOtherEntries, setCancelOtherEntries] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tableSeatMap, setTableSeatMap] = useState<Record<string, number[]>>({})
  const [isLoadingTables, setIsLoadingTables] = useState<boolean>(true)

  const relevantTables = useMemo(
    () => tables.filter((table) => table.game_id === entry.game_id),
    [tables, entry.game_id]
  )

  const availableTables = useMemo(
    () =>
      relevantTables.filter(
        (table) => (tableSeatMap[table.id]?.length ?? 0) > 0
      ),
    [relevantTables, tableSeatMap]
  )

  const seatOptions = selectedTable ? tableSeatMap[selectedTable] ?? [] : []

  const handleDialogClose = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setSelectedTable('')
      setSelectedSeat(null)
      setError(null)
      setTableSeatMap({})
      setIsLoadingTables(true)
    }
    onOpenChange(nextOpen)
  }

  const handleAssign = async (): Promise<void> => {
    if (!selectedTable || selectedSeat === null) {
      setError('Please select a table and seat')
      return
    }

    setIsAssigning(true)
    setError(null)

    try {
      // Check if seat is still available
      const isAvailable = await WaitlistTableIntegration.isSeatAvailable(
        selectedTable,
        selectedSeat
      )

      if (!isAvailable) {
        throw new Error('Seat is no longer available')
      }

      // Update waitlist entry status
      const result = await WaitlistStatusManager.seatPlayer(
        entry.id,
        selectedTable,
        selectedSeat,
        `Seated at table ${selectedTable}, seat ${selectedSeat}`,
        cancelOtherEntries
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to update waitlist status')
      }

      onAssignmentComplete()
      handleDialogClose(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign player')
    } finally {
      setIsAssigning(false)
    }
  }

  useEffect(() => {
    if (!open) {
      return
    }

    let isActive = true

    const loadSeatAvailability = async (): Promise<void> => {
      setIsLoadingTables(true)

      const seatEntries = await Promise.all(
        relevantTables.map(async (table) => {
          const seats = await WaitlistTableIntegration.getAvailableSeats(table.id)
          return { tableId: table.id, seats }
        })
      )

      if (!isActive) {
        return
      }

      const nextSeatMap: Record<string, number[]> = {}
      seatEntries.forEach(({ tableId, seats }) => {
        if (seats.length > 0) {
          nextSeatMap[tableId] = seats
        }
      })

      setTableSeatMap(nextSeatMap)
      setIsLoadingTables(false)
    }

    void loadSeatAvailability()

    return (): void => {
      isActive = false
    }
  }, [open, relevantTables])

  useEffect(() => {
    if (selectedTable && !tableSeatMap[selectedTable]) {
      setSelectedTable('')
      setSelectedSeat(null)
    }
  }, [selectedTable, tableSeatMap])

  return (
    <Dialog
      open={open}
      onOpenChange={handleDialogClose}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Assign Player to Table</DialogTitle>
        </DialogHeader>

        {isLoadingTables ? (
          <div className='flex flex-col items-center justify-center gap-3 py-6 text-center'>
            <Clock className='h-5 w-5 animate-spin text-muted-foreground' />
            <p className='text-sm text-muted-foreground'>Loading available tables...</p>
          </div>
        ) : availableTables.length === 0 ? (
          <Card>
            <CardContent className='p-6 text-center'>
              <AlertCircle className='h-12 w-12 mx-auto mb-4 text-orange-500' />
              <h3 className='text-lg font-medium mb-2'>No Available Tables</h3>
              <p className='text-muted-foreground'>
                There are no available tables for {entry.game?.name || 'this game'}.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-4'>
            {/* Player Info */}
            <Card>
              <CardContent className='p-4'>
                <div className='flex items-center gap-2 mb-2'>
                  <Users className='h-4 w-4' />
                  <span className='font-medium'>
                    {entry.player?.alias || 'Unknown Player'}
                  </span>
                  <Badge variant='outline'>
                    {entry.game?.game_type?.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div className='text-sm text-muted-foreground'>
                  ${entry.game?.small_blind}/${entry.game?.big_blind} -{' '}
                  {entry.game?.name}
                </div>
              </CardContent>
            </Card>

            {/* Table Selection */}
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Select Table</label>
              <Select
                value={selectedTable}
                onValueChange={(value) => {
                  setSelectedTable(value)
                  setSelectedSeat(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Choose a table...' />
                </SelectTrigger>
                <SelectContent>
                  {availableTables.map((table) => (
                    <SelectItem
                      key={table.id}
                      value={table.id}
                    >
                      <div className='flex items-center gap-2'>
                        <TableIcon className='h-4 w-4' />
                        <span>{table.name}</span>
                        <Badge
                          variant='secondary'
                          className='text-xs'
                        >
                          {(tableSeatMap[table.id]?.length ?? 0).toString()} open
                          {tableSeatMap[table.id]?.length === 1 ? ' seat' : ' seats'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seat Selection */}
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Select Seat</label>
              <Select
                value={selectedSeat?.toString() || ''}
                onValueChange={(value) => setSelectedSeat(parseInt(value, 10))}
                disabled={!selectedTable || seatOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedTable ? 'Choose a seat...' : 'Select a table first'} />
                </SelectTrigger>
                <SelectContent>
                  {seatOptions.map((seat) => (
                    <SelectItem
                      key={seat}
                      value={seat.toString()}
                    >
                      Seat {seat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedTable && (
                <p className='text-xs text-muted-foreground'>Select a table to view open seats.</p>
              )}
            </div>

            {/* Cancel Other Entries Option */}
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='cancel-other-entries'
                checked={cancelOtherEntries}
                onCheckedChange={(checked): void =>
                  setCancelOtherEntries(checked as boolean)
                }
              />
              <label
                htmlFor='cancel-other-entries'
                className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
              >
                Cancel other waitlist entries
              </label>
            </div>
            <p className='text-xs text-muted-foreground ml-6'>
              If the player is on other waitlists, cancel those entries when
              seating them.
            </p>

            {/* Error Message */}
            {error && (
              <div className='p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md'>
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className='flex justify-end space-x-2'>
              <Button
                onClick={handleAssign}
                disabled={!selectedTable || selectedSeat === null || isAssigning}
              >
                {isAssigning ? (
                  <Clock className='h-4 w-4 mr-2 animate-spin' />
                ) : (
                  <CheckCircle className='h-4 w-4 mr-2' />
                )}
                {isAssigning ? 'Assigning...' : 'Assign Player'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
