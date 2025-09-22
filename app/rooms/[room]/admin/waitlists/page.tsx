'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOperator } from '@/lib/auth/user-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'
import { ArrowLeft, Users, Table as TableIcon, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { WaitlistPlayerDialog } from '@/components/admin/waitlist-player-dialog'
import { OpenTableDialog } from '@/components/admin/open-table-dialog'
import { WaitlistRow } from '@/components/admin/waitlist-row'
import { ExpiredWaitlistTable } from '@/components/admin/expired-waitlist-table'
import { TableLayoutDialog } from '@/components/admin/table-layout-dialog'
import { WaitlistExpirySystem } from '@/lib/waitlist-expiry-system'
import {
  shouldShowInActiveList,
  type WaitlistStatus,
} from '@/lib/waitlist-status-utils'
import type { Database } from '@/types/database'

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

interface Table {
  id: string
  name: string
  seat_count: number
  is_active: boolean
}

interface TableSession {
  id: string
  table_id: string
  game_id: string
  room_id: string
  start_time: string
  end_time: string | null
  table: Table
  game: {
    id: string
    name: string
    game_type: string
  }
}

export default function WaitlistPage(): JSX.Element {
  const [loading, setLoading] = useState(true)
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([])
  const [expiredEntries, setExpiredEntries] = useState<WaitlistEntry[]>([])
  const [activeTables, setActiveTables] = useState<TableSession[]>([])
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [openTableDialogOpen, setOpenTableDialogOpen] = useState(false)
  const [selectedTableSession, setSelectedTableSession] =
    useState<TableSession | null>(null)
  const [tableLayoutDialogOpen, setTableLayoutDialogOpen] = useState(false)
  const operator = useOperator()
  const router = useRouter()

  const fetchData = useCallback(async (): Promise<void> => {
    if (!operator?.profile?.room_id) return

    try {
      const supabase = createClient()

      // Fetch all waitlist entries
      const { data: allEntriesData, error: entriesError } = await supabase
        .from('waitlist_entries')
        .select(
          `
          *,
          player:players(id, alias, avatar_url),
          game:games(id, name, game_type, small_blind, big_blind)
        `
        )
        .eq('room_id', operator.profile.room_id)
        .order('position', { ascending: true })

      if (entriesError) {
        console.error('Error fetching waitlist entries:', entriesError)
        return
      }

      // Filter active entries
      const activeEntries = (allEntriesData || []).filter((entry) =>
        shouldShowInActiveList(entry.status)
      )
      setWaitlistEntries(activeEntries)

      // Fetch expired entries
      const expired = await WaitlistExpirySystem.getExpiredEntries(
        operator.profile.room_id
      )
      setExpiredEntries(expired)

      // Fetch active table sessions
      const { data: tableSessionsData, error: tableSessionsError } =
        await supabase
          .from('table_sessions')
          .select(
            `
          *,
          table:tables(id, name, seat_count, is_active),
          game:games(id, name, game_type)
        `
          )
          .eq('room_id', operator.profile.room_id)
          .is('end_time', null)
          .order('start_time', { ascending: true })

      if (tableSessionsError) {
        console.error('Error fetching table sessions:', tableSessionsError)
      }

      setActiveTables(tableSessionsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [operator?.profile?.room_id])

  useEffect(() => {
    fetchData()

    // Start expiry checking system
    if (operator?.profile?.room_id) {
      const cleanup = WaitlistExpirySystem.startExpiryChecking(
        operator.profile.room_id
      )

      // Set up real-time subscriptions for waitlist and table changes
      const supabase = createClient()
      const waitlistSubscription = supabase
        .channel('waitlist-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'waitlist_entries',
            filter: `room_id=eq.${operator.profile.room_id}`,
          },
          (_payload) => {
            // Refetch data when any waitlist entry changes
            fetchData()
          }
        )
        .subscribe()

      const tableSubscription = supabase
        .channel('table-sessions-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'table_sessions',
            filter: `room_id=eq.${operator.profile.room_id}`,
          },
          (_payload) => {
            // Refetch data when any table session changes
            fetchData()
          }
        )
        .subscribe()

      return (): void => {
        cleanup()
        waitlistSubscription.unsubscribe()
        tableSubscription.unsubscribe()
      }
    }
  }, [fetchData, operator?.profile?.room_id])

  // Handle case where operator is not available
  if (!operator) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center'>
          <h2 className='text-xl font-semibold mb-2'>Access Denied</h2>
          <p className='text-muted-foreground mb-4'>
            You need to be logged in as an operator to access this page.
          </p>
          <Button onClick={() => router.push('/login')}>Go to Login</Button>
        </div>
      </div>
    )
  }

  const handleReorder = (entryId: string, action: string): void => {
    setWaitlistEntries((prevEntries) => {
      const newEntries = [...prevEntries]

      // Find the entry to move
      const entryIndex = newEntries.findIndex((entry) => entry.id === entryId)
      if (entryIndex === -1) return prevEntries

      const entry = newEntries[entryIndex]

      // Find other entries in the same game
      const gameEntries = newEntries.filter((e) => e.game_id === entry.game_id)
      const gameEntryIndices = gameEntries
        .map((e) => newEntries.indexOf(e))
        .sort((a, b) => a - b)
      const currentGameIndex = gameEntryIndices.indexOf(entryIndex)

      switch (action) {
        case 'moveToTop':
          if (currentGameIndex > 0) {
            // Move to the very top of the game
            const topIndex = gameEntryIndices[0]
            const temp = newEntries[entryIndex]
            newEntries[entryIndex] = newEntries[topIndex]
            newEntries[topIndex] = temp
          }
          break
        case 'moveUp':
        case 'move-up':
          if (currentGameIndex > 0) {
            // Move up: swap with the entry directly above (1 position)
            const aboveIndex = gameEntryIndices[currentGameIndex - 1]
            const temp = newEntries[entryIndex]
            newEntries[entryIndex] = newEntries[aboveIndex]
            newEntries[aboveIndex] = temp
          }
          break
        case 'moveDown':
        case 'move-down':
          if (currentGameIndex < gameEntryIndices.length - 1) {
            // Move down: swap with the entry directly below (1 position)
            const belowIndex = gameEntryIndices[currentGameIndex + 1]
            const temp = newEntries[entryIndex]
            newEntries[entryIndex] = newEntries[belowIndex]
            newEntries[belowIndex] = temp
          }
          break
        case 'moveToBottom':
          if (currentGameIndex < gameEntryIndices.length - 1) {
            // Move to the very bottom of the game
            const bottomIndex = gameEntryIndices[gameEntryIndices.length - 1]
            const temp = newEntries[entryIndex]
            newEntries[entryIndex] = newEntries[bottomIndex]
            newEntries[bottomIndex] = temp
          }
          break
      }

      return newEntries
    })
  }

  const handleRowClick = (entry: WaitlistEntry): void => {
    setSelectedEntry(entry)
    setDialogOpen(true)
  }

  const handleDialogClose = (): void => {
    setDialogOpen(false)
    setSelectedEntry(null)
  }

  const handleStatusChange = async (
    entryId: string,
    newStatus: WaitlistStatus
  ): Promise<void> => {
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
        .eq('id', entryId)
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

      // Update local state
      setWaitlistEntries((prev) =>
        prev.map((entry) => (entry.id === entryId ? updatedEntry : entry))
      )
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleAssignToTable = (entryId: string): void => {
    const entry = waitlistEntries.find((e) => e.id === entryId)
    if (entry) {
      setSelectedEntry(entry)
      setDialogOpen(true)
    }
  }

  const handleExpired = async (entryId: string): Promise<void> => {
    await handleStatusChange(entryId, 'expired')
    // Refresh expired entries
    if (operator?.profile?.room_id) {
      const expired = await WaitlistExpirySystem.getExpiredEntries(
        operator.profile.room_id
      )
      setExpiredEntries(expired)
    }
  }

  const handleEntryUpdated = (updatedEntry: WaitlistEntry): void => {
    setWaitlistEntries((prev) =>
      prev.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry))
    )
  }

  const handleOpenTable = (): void => {
    setOpenTableDialogOpen(true)
  }

  // Add new function to open table for specific game
  const handleOpenTableForGame = async (gameId: string): Promise<void> => {
    if (!operator?.profile?.room_id) return

    try {
      const supabase = createClient()

      // First, find an available table for this game
      const { data: availableTables, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .eq('game_id', gameId)
        .eq('is_active', true)
        .limit(1)

      if (tablesError) {
        console.error('Error fetching available tables:', tablesError)
        return
      }

      if (!availableTables || availableTables.length === 0) {
        console.error('No available tables for this game')
        return
      }

      const table = availableTables[0]

      // Create table session
      const tableSessionData = {
        table_id: table.id,
        game_id: gameId,
        room_id: operator.profile.room_id,
        start_time: new Date().toISOString(),
      }

      const { data: newTableSession, error } = await supabase
        .from('table_sessions')
        .insert(tableSessionData)
        .select(
          `
          *,
          table:tables(id, name, seat_count, is_active),
          game:games(id, name, game_type)
        `
        )
        .single()

      if (error) {
        console.error('Error creating table session:', error)
        return
      }

      // Add to active tables
      setActiveTables((prev) => [newTableSession, ...prev])
    } catch (error) {
      console.error('Error opening table for game:', error)
    }
  }

  const handleTableOpened = (newTableSession: TableSession): void => {
    setActiveTables((prev) => [newTableSession, ...prev])
    setOpenTableDialogOpen(false)
  }

  const handleTableClick = (session: TableSession): void => {
    setSelectedTableSession(session)
    setTableLayoutDialogOpen(true)
  }

  const handleRejoinWaitlist = async (entry: WaitlistEntry): Promise<void> => {
    if (!operator?.profile?.room_id) return

    try {
      const supabase = createClient()

      // Update the existing entry to rejoin the waitlist
      const { data: updatedEntry, error } = await supabase
        .from('waitlist_entries')
        .update({
          status: 'waiting',
          cancelled_at: null,
          cancelled_by: null,
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
        console.error('Error rejoining waitlist:', error)
        return
      }

      // Add to active waitlist entries
      setWaitlistEntries((prev) => [...prev, updatedEntry])

      // Remove from expired entries
      setExpiredEntries((prev) => prev.filter((e) => e.id !== entry.id))
    } catch (error) {
      console.error('Error rejoining waitlist:', error)
    }
  }

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
      {/* Header with back button */}
      <div className='flex items-center gap-4'>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8'
          onClick={() => router.back()}
        >
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <h1 className='text-3xl font-bold tracking-tight'>
          Waitlist Management
        </h1>
      </div>

      {/* Active Tables Section */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2'>
              <TableIcon className='h-5 w-5' />
              Active Tables
            </CardTitle>
            <Button onClick={handleOpenTable}>
              <Plus className='h-4 w-4 mr-2' />
              Open Table
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeTables.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              <TableIcon className='h-12 w-12 mx-auto mb-4 opacity-50' />
              <p>No active tables. Open a table to start seating players.</p>
            </div>
          ) : (
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {activeTables.map((session) => (
                <Card
                  key={session.id}
                  className='p-4 cursor-pointer hover:bg-muted/50 transition-colors'
                  onClick={() => handleTableClick(session)}
                >
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <h3 className='font-semibold'>{session.table.name}</h3>
                    </div>
                    <p className='text-sm text-muted-foreground'>
                      {session.game.name}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      Started:{' '}
                      {new Date(session.start_time).toLocaleTimeString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Waitlist Section */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2'>
              <Users className='h-5 w-5' />
              Waitlist
            </CardTitle>
            <Button
              variant='outline'
              size='sm'
            >
              <Plus className='h-4 w-4 mr-2' />
              Add to Waitlist
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {waitlistEntries.length > 0 ? (
              // Group entries by game and sort by position
              Object.entries(
                waitlistEntries.reduce(
                  (acc, entry) => {
                    const gameId = entry.game?.id || 'unknown'
                    if (!acc[gameId]) {
                      acc[gameId] = {
                        game: entry.game,
                        entries: [],
                      }
                    }
                    acc[gameId].entries.push(entry)
                    return acc
                  },
                  {} as Record<
                    string,
                    { game: WaitlistEntry['game']; entries: WaitlistEntry[] }
                  >
                )
              )
                .map(([_gameId, gameData]) => {
                  // Use the order from waitlistEntries state (which includes optimistic updates)
                  // instead of sorting by position from database
                  const sortedEntries = gameData.entries.sort((a, b) => {
                    const aIndex = waitlistEntries.findIndex(
                      (entry) => entry.id === a.id
                    )
                    const bIndex = waitlistEntries.findIndex(
                      (entry) => entry.id === b.id
                    )
                    return aIndex - bIndex
                  })
                  return {
                    ...gameData,
                    entries: sortedEntries,
                  }
                })
                .sort((a, b) => {
                  // Sort games by the first entry's position in the waitlistEntries state
                  const aFirstEntry = a.entries[0]
                  const bFirstEntry = b.entries[0]
                  const aIndex = waitlistEntries.findIndex(
                    (entry) => entry.id === aFirstEntry.id
                  )
                  const bIndex = waitlistEntries.findIndex(
                    (entry) => entry.id === bFirstEntry.id
                  )
                  return aIndex - bIndex
                })
                .map((gameData) => (
                  <div
                    key={gameData.game?.id || 'unknown'}
                    className='border rounded-lg'
                  >
                    {/* Game Header */}
                    <div className='bg-muted/50 px-4 py-3 border-b'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <h3 className='font-semibold'>
                            {gameData.game?.name || 'Unknown Game'}
                          </h3>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Badge variant='outline'>
                            {
                              gameData.entries.filter(
                                (entry) => entry.status === 'calledin'
                              ).length
                            }{' '}
                            called in
                          </Badge>
                          <Badge variant='secondary'>
                            {
                              gameData.entries.filter(
                                (entry) => entry.status === 'waiting'
                              ).length
                            }{' '}
                            live
                          </Badge>
                          {gameData.game?.id && (
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() =>
                                handleOpenTableForGame(gameData.game!.id)
                              }
                              className='ml-2'
                            >
                              <TableIcon className='h-3 w-3 mr-1' />
                              Open Table
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Players List */}
                    <div className='divide-y'>
                      {gameData.entries.map((entry, index) => (
                        <WaitlistRow
                          key={`${entry.id}-${entry.position}`}
                          entry={entry}
                          position={index + 1}
                          onStatusChange={handleStatusChange}
                          onAssignToTable={handleAssignToTable}
                          onRowClick={handleRowClick}
                          onExpired={handleExpired}
                          onReorder={handleReorder}
                        />
                      ))}
                    </div>
                  </div>
                ))
            ) : (
              <div className='text-center py-8 text-muted-foreground'>
                No players on waitlist. Add players using the button above.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expired/Cancelled Entries */}
      <ExpiredWaitlistTable
        entries={expiredEntries}
        onRejoinWaitlist={handleRejoinWaitlist}
      />

      <WaitlistPlayerDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        entry={selectedEntry}
        onEntryUpdated={handleEntryUpdated}
        activeTables={activeTables}
      />

      <OpenTableDialog
        open={openTableDialogOpen}
        onOpenChange={setOpenTableDialogOpen}
        onTableOpened={handleTableOpened}
        roomId={operator?.profile?.room_id || ''}
      />

      <TableLayoutDialog
        open={tableLayoutDialogOpen}
        onOpenChange={setTableLayoutDialogOpen}
        tableSession={selectedTableSession}
        waitlistEntries={waitlistEntries}
      />
    </div>
  )
}
