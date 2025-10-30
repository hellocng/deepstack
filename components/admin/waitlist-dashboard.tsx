'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loading } from '@/components/ui/loading'
import { useWaitlistRealtime } from '@/lib/hooks/use-waitlist-realtime'
import { WaitlistRow } from './waitlist-row'
import { ExpiredWaitlistTable } from './expired-waitlist-table'
import { WaitlistPlayerDialog } from './waitlist-player-dialog'
import { AdminWaitlistDialog } from '@/components/admin/admin-waitlist-dialog'
import { WaitlistStats } from './waitlist-stats'
import { WaitlistFilters } from './waitlist-filters'
import {
  Users,
  Clock,
  Phone,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Plus,
} from 'lucide-react'
import type { Database } from '@/types/database'
import type { WaitlistStatus } from '@/lib/waitlist-status-utils'

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

interface WaitlistDashboardProps {
  roomId: string
  activeTables: Array<{
    id: string
    name: string
    seat_count: number
    available_seats: number
  }>
  games: Database['public']['Tables']['games']['Row'][]
  room: Database['public']['Tables']['rooms']['Row']
}

export function WaitlistDashboard({
  roomId,
  activeTables: _activeTables,
  games,
  room,
}: WaitlistDashboardProps): JSX.Element {
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [staffDialogOpen, setStaffDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterGame, setFilterGame] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { entries, loading, error, refetch } = useWaitlistRealtime({
    roomId,
  })

  // Filter entries based on current filters
  const filteredEntries = entries.filter((entry) => {
    if (filterStatus !== 'all' && entry.status !== filterStatus) {
      return false
    }
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

  // Group entries by status
  const waitingEntries = filteredEntries.filter(
    (entry) => entry.status === 'waiting'
  )
  const calledInEntries = filteredEntries.filter(
    (entry) => entry.status === 'calledin'
  )
  const notifiedEntries = filteredEntries.filter(
    (entry) => entry.status === 'notified'
  )

  const handleEntryClick = (entry: WaitlistEntry): void => {
    setSelectedEntry(entry)
    setDialogOpen(true)
  }

  const handleEntryUpdated = (_updatedEntry: WaitlistEntry): void => {
    // The real-time hook will handle the update
    setDialogOpen(false)
    setSelectedEntry(null)
  }

  const getStatusCounts = (): Record<string, number> => {
    return {
      waiting: waitingEntries.length,
      calledin: calledInEntries.length,
      notified: notifiedEntries.length,
      total: filteredEntries.length,
    }
  }

  const statusCounts = getStatusCounts()

  const handleStatusChange = async (
    _entryId: string,
    _newStatus: WaitlistStatus
  ): Promise<void> => {
    // No-op in dashboard view; full controls available in admin waitlists page
  }

  const handleAssignToTable = (_entryId: string): void => {
    // No-op in dashboard view; full controls available in admin waitlists page
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
      <div className='text-center py-8'>
        <AlertCircle className='h-12 w-12 mx-auto mb-4 text-red-500' />
        <h3 className='text-lg font-medium text-red-600 mb-2'>
          Error Loading Waitlist
        </h3>
        <p className='text-muted-foreground mb-4'>{error}</p>
        <Button onClick={refetch}>
          <RefreshCw className='h-4 w-4 mr-2' />
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Stats Cards */}
      <WaitlistStats entries={entries} />

      {/* Action Buttons */}
      <div className='flex justify-end'>
        <Button onClick={(): void => setStaffDialogOpen(true)}>
          <Plus className='h-4 w-4 mr-2' />
          Add Player
        </Button>
      </div>

      {/* Filters */}
      <WaitlistFilters
        entries={entries}
        filterStatus={filterStatus}
        filterGame={filterGame}
        searchQuery={searchQuery}
        onStatusChange={setFilterStatus}
        onGameChange={setFilterGame}
        onSearchChange={setSearchQuery}
        onRefresh={refetch}
      />

      {/* Main Content */}
      <Tabs
        defaultValue='active'
        className='space-y-4'
      >
        <TabsList>
          <TabsTrigger
            value='active'
            className='flex items-center gap-2'
          >
            <Users className='h-4 w-4' />
            Active ({statusCounts.total})
          </TabsTrigger>
          <TabsTrigger
            value='expired'
            className='flex items-center gap-2'
          >
            <Clock className='h-4 w-4' />
            Expired
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value='active'
          className='space-y-4'
        >
          {/* Status Summary */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium flex items-center gap-2'>
                  <CheckCircle className='h-4 w-4 text-green-600' />
                  Waiting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{statusCounts.waiting}</div>
                <p className='text-xs text-muted-foreground'>
                  Checked in and ready
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium flex items-center gap-2'>
                  <Phone className='h-4 w-4 text-blue-600' />
                  Called In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {statusCounts.calledin}
                </div>
                <p className='text-xs text-muted-foreground'>
                  Need to check in
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium flex items-center gap-2'>
                  <AlertCircle className='h-4 w-4 text-orange-600' />
                  Notified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {statusCounts.notified}
                </div>
                <p className='text-xs text-muted-foreground'>Seat available</p>
              </CardContent>
            </Card>
          </div>

          {/* Waitlist Entries */}
          <div className='space-y-4'>
            {filteredEntries.length === 0 ? (
              <Card>
                <CardContent className='p-8 text-center'>
                  <Users className='h-12 w-12 mx-auto mb-4 text-muted-foreground' />
                  <h3 className='text-lg font-medium mb-2'>
                    No Waitlist Entries
                  </h3>
                  <p className='text-muted-foreground'>
                    {searchQuery ||
                    filterStatus !== 'all' ||
                    filterGame !== 'all'
                      ? 'No entries match your current filters.'
                      : 'No players are currently on the waitlist.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className='space-y-2'>
                {filteredEntries.map((entry, index) => (
                  <WaitlistRow
                    key={entry.id}
                    entry={entry}
                    position={index + 1}
                    onRowClick={(): void => handleEntryClick(entry)}
                    onStatusChange={handleStatusChange}
                    onAssignToTable={handleAssignToTable}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value='expired'>
          <ExpiredWaitlistTable roomId={roomId} />
        </TabsContent>
      </Tabs>

      {/* Entry Details Dialog */}
      <WaitlistPlayerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={selectedEntry}
        onEntryUpdated={handleEntryUpdated}
        activeTables={[]}
      />

      {/* Staff Add Player Dialog */}
      <AdminWaitlistDialog
        open={staffDialogOpen}
        onOpenChange={setStaffDialogOpen}
        games={games}
        room={room}
        onJoined={refetch}
      />
    </div>
  )
}
