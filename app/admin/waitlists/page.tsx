'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useOperator } from '@/lib/auth/user-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loading } from '@/components/ui/loading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WaitlistRow } from '@/components/admin/waitlist-row'
import { WaitlistPlayerDialog } from '@/components/admin/waitlist-player-dialog'
import { AdminWaitlistDialog } from '@/components/admin/admin-waitlist-dialog'
import { WaitlistTableAssignment } from '@/components/admin/waitlist-table-assignment'
import { TableLayoutDialog } from '@/components/admin/table-layout-dialog'
import { useWaitlistRealtime } from '@/lib/hooks/use-waitlist-realtime'
import {
  Plus,
  Search,
  Table as TableIcon,
  Users,
  ArrowLeft,
} from 'lucide-react'
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

type Game = Database['public']['Tables']['games']['Row']
type Room = Database['public']['Tables']['rooms']['Row']

type TableSession = {
  id: string
  table_id: string
  game_id: string
  room_id: string
  start_time: string
  end_time: string | null
  playerCount: number
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

export default function WaitlistPage(): JSX.Element {
  const router = useRouter()
  const operator = useOperator()
  const [room, setRoom] = useState<Room | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [openTableSessions, setOpenTableSessions] = useState<TableSession[]>([])
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null)
  const [selectedTableSession, setSelectedTableSession] =
    useState<TableSession | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [staffDialogOpen, setStaffDialogOpen] = useState(false)
  const [tableAssignmentOpen, setTableAssignmentOpen] = useState(false)
  const [tableLayoutOpen, setTableLayoutOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterGame, setFilterGame] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { entries, loading, error } = useWaitlistRealtime({
    roomId: operator?.profile?.room_id || '',
  })

  // Optimistic UI state for waitlist entries
  const [uiEntries, setUiEntries] = useState<WaitlistEntry[]>([])

  useEffect(() => {
    setUiEntries(entries)
  }, [entries])

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      if (!operator?.profile?.room_id) return

      try {
        const supabase = createClient()

        // Room
        const { data: roomData } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', operator.profile.room_id)
          .single()
        setRoom(roomData ?? null)

        // Active games for room
        const { data: gamesData } = await supabase
          .from('games')
          .select('*')
          .eq('room_id', operator.profile.room_id)
          .eq('is_active', true)
          .order('name')
        setGames(gamesData ?? [])

        // Open table sessions with player counts
        const { data: tableSessionsData } = await supabase
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
          .order('start_time', { ascending: false })

        // Get player counts for each table session
        const tableSessionsWithPlayerCounts = await Promise.all(
          (tableSessionsData ?? []).map(async (session) => {
            const { count: playerCount } = await supabase
              .from('player_sessions')
              .select('*', { count: 'exact', head: true })
              .eq('table_session_id', session.id)
              .is('end_time', null)

            return {
              ...session,
              playerCount: playerCount ?? 0,
            }
          })
        )

        setOpenTableSessions(tableSessionsWithPlayerCounts)
      } catch (e) {
        console.error('Error fetching data:', e)
      }
    }

    fetchData()
  }, [operator?.profile?.room_id])

  // Filter entries based on current filters (excluding status filter for expired)
  const baseFilteredEntries = uiEntries.filter((entry) => {
    if (filterGame !== 'all' && entry.game_id !== filterGame) {
      return false
    }
    if (
      searchQuery &&
      !entry.player?.alias?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }
    return true
  })

  // Apply status filter only to active entries
  const activeEntries = baseFilteredEntries.filter((entry) => {
    const isActiveStatus = ['waiting', 'calledin', 'notified'].includes(
      entry.status || ''
    )
    if (!isActiveStatus) return false

    // Apply status filter to active entries only
    if (filterStatus !== 'all' && entry.status !== filterStatus) {
      return false
    }
    return true
  })

  const entriesByGame = games.reduce(
    (acc, game) => {
      const gameEntries = activeEntries.filter(
        (entry) => entry.game_id === game.id
      )
      if (gameEntries.length > 0) {
        acc[game.id] = {
          game,
          entries: gameEntries.sort(
            (a, b) => (a.position || 0) - (b.position || 0)
          ),
        }
      }
      return acc
    },
    {} as Record<string, { game: Game; entries: WaitlistEntry[] }>
  )

  // Group expired entries by game (no status filter applied)
  const expiredEntries = baseFilteredEntries.filter((entry) =>
    ['expired', 'cancelled'].includes(entry.status || '')
  )

  const expiredEntriesByGame = games.reduce(
    (acc, game) => {
      const gameEntries = expiredEntries.filter(
        (entry) => entry.game_id === game.id
      )
      if (gameEntries.length > 0) {
        acc[game.id] = {
          game,
          entries: gameEntries.sort(
            (a, b) => (a.position || 0) - (b.position || 0)
          ),
        }
      }
      return acc
    },
    {} as Record<string, { game: Game; entries: WaitlistEntry[] }>
  )

  const handleEntryClick = (entry: WaitlistEntry): void => {
    setSelectedEntry(entry)
    setDialogOpen(true)
  }

  const handleEntryUpdated = (): void => {
    setDialogOpen(false)
    setSelectedEntry(null)
  }

  const handleAssignToTable = (entry: WaitlistEntry): void => {
    setSelectedEntry(entry)
    setTableAssignmentOpen(true)
  }

  const handleTableAssignmentComplete = (): void => {
    setTableAssignmentOpen(false)
    setSelectedEntry(null)
  }

  const handleTableAssignmentOpenChange = (open: boolean): void => {
    setTableAssignmentOpen(open)
    if (!open) {
      setSelectedEntry(null)
    }
  }

  const handleTableSessionClick = (tableSession: TableSession): void => {
    setSelectedTableSession(tableSession)
    setTableLayoutOpen(true)
  }

  const handleTableLayoutClose = (): void => {
    setTableLayoutOpen(false)
    setSelectedTableSession(null)
  }

  const handleStatusChange = async (
    entryId: string,
    newStatus: string
  ): Promise<void> => {
    try {
      const roomId = operator?.profile?.room_id
      if (!roomId) return

      const response = await fetch(
        `/api/rooms/${roomId}/waitlist/${entryId}/status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      // The real-time hook will automatically update the entries
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleReorder = async (
    entryId: string,
    action: string
  ): Promise<void> => {
    const roomId = operator?.profile?.room_id
    if (!roomId) return

    // Optimistically reorder locally within the same game among active statuses
    const previous = uiEntries
    const next = [...uiEntries]

    const index = next.findIndex((e) => e.id === entryId)
    if (index === -1) return

    const moved = next[index]
    const isActiveStatus = (s: string | null) =>
      ['waiting', 'calledin', 'notified'].includes(s || '')
    const sameGroup = next
      .filter((e) => e.game_id === moved.game_id && isActiveStatus(e.status))
      .sort((a, b) => (a.position || 0) - (b.position || 0))

    const groupIds = sameGroup.map((e) => e.id)
    const currIdx = groupIds.indexOf(entryId)
    if (currIdx === -1) return

    let targetIdx = currIdx
    switch (action) {
      case 'move-up':
        targetIdx = Math.max(0, currIdx - 1)
        break
      case 'move-down':
        targetIdx = Math.min(groupIds.length - 1, currIdx + 1)
        break
      case 'move-to-top':
        targetIdx = 0
        break
      case 'move-to-bottom':
        targetIdx = groupIds.length - 1
        break
      default:
        break
    }

    if (targetIdx !== currIdx) {
      const reordered = [...groupIds]
      const [removed] = reordered.splice(currIdx, 1)
      reordered.splice(targetIdx, 0, removed)

      // Apply new positions to next
      for (let i = 0; i < reordered.length; i++) {
        const id = reordered[i]
        const idx = next.findIndex((e) => e.id === id)
        if (idx !== -1) {
          next[idx] = { ...next[idx], position: i + 1 }
        }
      }

      setUiEntries(next)
    }

    try {
      const response = await fetch(
        `/api/rooms/${roomId}/waitlist/${entryId}/${action}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      )
      if (!response.ok) {
        throw new Error('Failed to reorder entry')
      }
    } catch (err) {
      console.error('Error reordering entry:', err)
      // Revert on failure
      setUiEntries(previous)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loading
          size='lg'
          text='Loading waitlist...'
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex items-center justify-center h-64 text-red-600'>
        Error loading waitlist: {error}
      </div>
    )
  }

  if (!room) {
    return (
      <div className='flex items-center justify-center h-64 text-muted-foreground'>
        Room not found
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header with back button */}
      <div className='flex items-center justify-between'>
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
            <h1 className='text-3xl font-bold tracking-tight'>Waitlist</h1>
          </div>
        </div>
        <Button onClick={(): void => setStaffDialogOpen(true)}>
          <Plus className='h-4 w-4 mr-2' />
          Add to Waitlist
        </Button>
      </div>

      {/* Open Tables */}
      {openTableSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <TableIcon className='h-5 w-5' />
              Open Tables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {openTableSessions.map((tableSession) => (
                <Card
                  key={tableSession.id}
                  className='p-4 cursor-pointer hover:bg-muted/50 transition-colors'
                  onClick={(): void => handleTableSessionClick(tableSession)}
                >
                  <div className='flex items-center justify-between mb-2'>
                    <h3 className='font-medium'>{tableSession.table.name}</h3>
                    <Badge variant='outline'>{tableSession.game.name}</Badge>
                  </div>
                  <div className='space-y-1 text-sm text-muted-foreground'>
                    <div className='flex items-center gap-2'>
                      <Users className='h-4 w-4' />
                      <span>
                        {tableSession.playerCount || 0} /{' '}
                        {tableSession.table.seat_count} players
                      </span>
                    </div>
                    <div className='text-xs'>
                      Started:{' '}
                      {new Date(tableSession.start_time).toLocaleTimeString()}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters - Always Visible */}
      <Card>
        <CardContent className='p-4'>
          <div className='flex flex-col sm:flex-row gap-4'>
            {/* Search */}
            <div className='flex-1'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search players...'
                  value={searchQuery}
                  onChange={(e): void => setSearchQuery(e.target.value)}
                  className='pl-10'
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className='w-full sm:w-48'>
              <Select
                value={filterStatus}
                onValueChange={setFilterStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder='All Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Status</SelectItem>
                  <SelectItem value='waiting'>Waiting</SelectItem>
                  <SelectItem value='calledin'>Called In</SelectItem>
                  <SelectItem value='notified'>Notified</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Game Filter */}
            <div className='w-full sm:w-48'>
              <Select
                value={filterGame}
                onValueChange={setFilterGame}
              >
                <SelectTrigger>
                  <SelectValue placeholder='All Games' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Games</SelectItem>
                  {games.map((game) => (
                    <SelectItem
                      key={game.id}
                      value={game.id}
                    >
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Waitlist Tabs */}
      <Tabs
        defaultValue='active'
        className='w-full'
      >
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger value='active'>
            Active Waitlist
            <Badge
              variant='secondary'
              className='ml-2'
            >
              {activeEntries.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value='expired'>
            Expired/Cancelled
            <Badge
              variant='secondary'
              className='ml-2'
            >
              {expiredEntries.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value='active'
          className='space-y-6'
        >
          {Object.keys(entriesByGame).length === 0 ? (
            <Card>
              <CardContent className='p-8 text-center'>
                <p className='text-muted-foreground'>
                  No players on waitlist. Add players using the button above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className='space-y-6'>
              {Object.values(entriesByGame).map(
                ({ game, entries: gameEntries }) => {
                  const callinCount = gameEntries.filter(
                    (e) => e.status === 'calledin'
                  ).length
                  const waitingCount = gameEntries.filter(
                    (e) => e.status === 'waiting'
                  ).length

                  return (
                    <Card key={game.id}>
                      <CardHeader>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <CardTitle className='flex items-center gap-2'>
                              {game.name}
                            </CardTitle>
                            <Badge variant='outline'>
                              Call In: {callinCount}
                            </Badge>
                            <Badge variant='outline'>
                              Live: {waitingCount}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className='space-y-2'>
                          {gameEntries.map((entry, index) => (
                            <WaitlistRow
                              key={entry.id}
                              entry={entry}
                              position={index + 1}
                              onStatusChange={handleStatusChange}
                              onAssignToTable={(): void =>
                                handleAssignToTable(entry)
                              }
                              onRowClick={(): void => handleEntryClick(entry)}
                              onExpired={(): void => {}}
                              onReorder={handleReorder}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                }
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent
          value='expired'
          className='space-y-6'
        >
          {Object.keys(expiredEntriesByGame).length === 0 ? (
            <Card>
              <CardContent className='p-8 text-center'>
                <p className='text-muted-foreground'>
                  No expired or cancelled entries.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className='space-y-6'>
              {Object.values(expiredEntriesByGame).map(
                ({ game, entries: gameEntries }) => {
                  const expiredCount = gameEntries.filter(
                    (e) => e.status === 'expired'
                  ).length
                  const cancelledCount = gameEntries.filter(
                    (e) => e.status === 'cancelled'
                  ).length

                  return (
                    <Card key={game.id}>
                      <CardHeader>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <CardTitle className='flex items-center gap-2'>
                              {game.name}
                            </CardTitle>
                            <Badge variant='destructive'>
                              Expired: {expiredCount}
                            </Badge>
                            <Badge variant='secondary'>
                              Cancelled: {cancelledCount}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className='space-y-2'>
                          {gameEntries.map((entry, index) => (
                            <WaitlistRow
                              key={entry.id}
                              entry={entry}
                              position={index + 1}
                              onStatusChange={handleStatusChange}
                              onAssignToTable={(): void =>
                                handleAssignToTable(entry)
                              }
                              onRowClick={(): void => handleEntryClick(entry)}
                              onExpired={(): void => {}}
                              onReorder={handleReorder}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                }
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Entry Details Dialog */}
      <WaitlistPlayerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={selectedEntry}
        onEntryUpdated={handleEntryUpdated}
        activeTables={openTableSessions}
      />

      {/* Staff Add Player Dialog */}
      <AdminWaitlistDialog
        open={staffDialogOpen}
        onOpenChange={setStaffDialogOpen}
        games={games}
        room={room}
        onJoined={(): void => {}}
      />

      {/* Table Assignment Dialog */}
      {selectedEntry && (
        <WaitlistTableAssignment
          entry={selectedEntry}
          tables={openTableSessions.map((session) => ({
            id: session.table.id,
            name: session.table.name,
            seat_count: session.table.seat_count,
            is_active: session.table.is_active,
            room_id: session.room_id,
            created_at: null,
            updated_at: null,
            available_seats: session.table.seat_count, // Will be calculated properly
            current_players: 0, // Will be calculated properly
            game_id: session.game_id,
          }))}
          open={tableAssignmentOpen}
          onOpenChange={handleTableAssignmentOpenChange}
          onAssignmentComplete={handleTableAssignmentComplete}
        />
      )}

      {/* Table Layout Dialog */}
      <TableLayoutDialog
        open={tableLayoutOpen}
        onOpenChange={handleTableLayoutClose}
        tableSession={selectedTableSession}
        waitlistEntries={entries}
        onPlayerAssigned={(): void => {}}
      />
    </div>
  )
}
