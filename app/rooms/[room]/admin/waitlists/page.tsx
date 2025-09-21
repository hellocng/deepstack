'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOperator } from '@/lib/auth/user-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'
import {
  ArrowLeft,
  Phone,
  Users,
  Table as TableIcon,
  Plus,
  CircleOff,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { WaitlistPlayerDialog } from '@/components/admin/waitlist-player-dialog'
import { OpenTableDialog } from '@/components/admin/open-table-dialog'

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
  const [voidedEntries, setVoidedEntries] = useState<WaitlistEntry[]>([])
  const [activeTables, setActiveTables] = useState<TableSession[]>([])
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [openTableDialogOpen, setOpenTableDialogOpen] = useState(false)
  const operator = useOperator()
  const router = useRouter()

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      if (!operator?.profile?.room_id) return

      try {
        const supabase = createClient()

        // Fetch active waitlist entries with player and game data
        const { data: waitlistData, error: waitlistError } = await supabase
          .from('waitlist_entries')
          .select(
            `
            *,
            player:players(id, alias, avatar_url),
            game:games(id, name, game_type, small_blind, big_blind)
          `
          )
          .eq('room_id', operator.profile.room_id)
          .in('status', ['waiting', 'called'])
          .order('created_at', { ascending: true })

        // Fetch voided waitlist entries
        const { data: voidedData, error: voidedError } = await supabase
          .from('waitlist_entries')
          .select(
            `
            *,
            player:players(id, alias, avatar_url),
            game:games(id, name, game_type, small_blind, big_blind)
          `
          )
          .eq('room_id', operator.profile.room_id)
          .in('status', ['cancelled'])
          .order('created_at', { ascending: false })

        if (waitlistError) {
          console.error('Error fetching waitlist entries:', waitlistError)
        }

        if (voidedError) {
          console.error('Error fetching voided entries:', voidedError)
        }

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

        setWaitlistEntries(waitlistData || [])
        setVoidedEntries(voidedData || [])
        setActiveTables(tableSessionsData || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [operator])

  const handleRowClick = (entry: WaitlistEntry): void => {
    setSelectedEntry(entry)
    setDialogOpen(true)
  }

  const handleDialogClose = (): void => {
    setDialogOpen(false)
    setSelectedEntry(null)
  }

  const handleEntryUpdated = (updatedEntry: WaitlistEntry): void => {
    // Update the appropriate list based on status
    if (['waiting', 'called'].includes(updatedEntry.status || 'waiting')) {
      setWaitlistEntries((prev) =>
        prev.map((entry) =>
          entry.id === updatedEntry.id ? updatedEntry : entry
        )
      )
    } else {
      // Move to voided list
      setWaitlistEntries((prev) =>
        prev.filter((entry) => entry.id !== updatedEntry.id)
      )
      setVoidedEntries((prev) => [updatedEntry, ...prev])
    }
    handleDialogClose()
  }

  const handleOpenTable = (): void => {
    setOpenTableDialogOpen(true)
  }

  const handleTableOpened = (newTableSession: TableSession): void => {
    setActiveTables((prev) => [newTableSession, ...prev])
    setOpenTableDialogOpen(false)
  }

  const getStatusBadge = (status: string): JSX.Element => {
    const statusConfig = {
      waiting: { variant: 'secondary' as const, label: 'Waiting' },
      called: { variant: 'default' as const, label: 'Called' },
      seated: { variant: 'outline' as const, label: 'Seated' },
      cancelled: { variant: 'secondary' as const, label: 'Cancelled' },
    }

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.waiting
    return <Badge variant={config.variant}>{config.label}</Badge>
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
                  className='p-4'
                >
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <h3 className='font-semibold'>{session.table.name}</h3>
                      <Badge variant='outline'>
                        {session.table.seat_count} seats
                      </Badge>
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
              // Group entries by game and sort by created_at
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
                .map(([_gameId, gameData]) => ({
                  ...gameData,
                  entries: gameData.entries.sort(
                    (a, b) =>
                      new Date(a.created_at || '').getTime() -
                      new Date(b.created_at || '').getTime()
                  ),
                }))
                .sort(
                  (a, b) =>
                    new Date(a.entries[0].created_at || '').getTime() -
                    new Date(b.entries[0].created_at || '').getTime()
                )
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
                          <p className='text-sm text-muted-foreground'>
                            ${gameData.game?.small_blind || 0}/$
                            {gameData.game?.big_blind || 0}
                          </p>
                        </div>
                        <Badge variant='outline'>
                          {gameData.entries.length} player
                          {gameData.entries.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>

                    {/* Players List */}
                    <div className='divide-y'>
                      {gameData.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className='px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors'
                          onClick={() => handleRowClick(entry)}
                        >
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-3'>
                              <span className='font-medium'>
                                {entry.player?.alias || 'Unknown Player'}
                              </span>
                              {entry.status === 'called' && (
                                <Phone className='h-4 w-4 text-blue-500' />
                              )}
                            </div>
                            <div className='flex items-center gap-2'>
                              {getStatusBadge(entry.status || 'waiting')}
                              <span className='text-sm text-muted-foreground'>
                                {new Date(
                                  entry.created_at || ''
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
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

      {/* Voided Waitlist Section */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2'>
              <CircleOff className='h-5 w-5' />
              Voided
            </CardTitle>
            <div className='flex gap-2'>
              <Badge variant='secondary'>
                {voidedEntries.filter((e) => e.status === 'cancelled').length}{' '}
                Cancelled
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {voidedEntries.length > 0 ? (
              // Group entries by game and sort by created_at
              Object.entries(
                voidedEntries.reduce(
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
                .map(([_gameId, gameData]) => ({
                  ...gameData,
                  entries: gameData.entries.sort(
                    (a, b) =>
                      new Date(a.created_at || '').getTime() -
                      new Date(b.created_at || '').getTime()
                  ),
                }))
                .sort(
                  (a, b) =>
                    new Date(a.entries[0].created_at || '').getTime() -
                    new Date(b.entries[0].created_at || '').getTime()
                )
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
                          <p className='text-sm text-muted-foreground'>
                            ${gameData.game?.small_blind || 0}/$
                            {gameData.game?.big_blind || 0}
                          </p>
                        </div>
                        <Badge variant='outline'>
                          {gameData.entries.length} player
                          {gameData.entries.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>

                    {/* Players List */}
                    <div className='divide-y'>
                      {gameData.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className='px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors'
                          onClick={() => handleRowClick(entry)}
                        >
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-3'>
                              <span className='font-medium'>
                                {entry.player?.alias || 'Unknown Player'}
                              </span>
                            </div>
                            <div className='flex items-center gap-2'>
                              {getStatusBadge(entry.status || 'waiting')}
                              <span className='text-sm text-muted-foreground'>
                                {new Date(
                                  entry.created_at || ''
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            ) : (
              <div className='text-center py-8 text-muted-foreground'>
                No voided entries found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
    </div>
  )
}
