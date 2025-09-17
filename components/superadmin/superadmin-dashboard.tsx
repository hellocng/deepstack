'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/types'
import { useUser, useSuperAdmin } from '@/lib/auth/user-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2, Settings } from 'lucide-react'
import { CreateRoomDialog } from '@/components/dialogs/create-room-dialog'
import { ManageRoomDialog } from '@/components/dialogs/manage-room-dialog'
import { Loading } from '@/components/ui/loading'

type Room = Tables<'rooms'>
type Operator = Tables<'operators'>
type Game = Tables<'games'>
// type Tournament = Tables<'tournaments'> // Unused for now

interface RoomWithStats extends Room {
  operators: Operator[]
  games: Game[]
  tournaments: Tables<'tournaments'>[]
  operator_count?: number
  total_games?: number
  total_tables?: number
  total_waitlist_players?: number
}

export function SuperAdminDashboard(): JSX.Element {
  const { loading: userLoading } = useUser()
  const superAdmin = useSuperAdmin()
  const [rooms, setRooms] = useState<RoomWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<RoomWithStats | null>(null)

  // Memoize the superAdmin check to prevent unnecessary re-renders
  const hasSuperAdmin = useMemo(() => !!superAdmin, [superAdmin])

  const fetchRooms = useCallback(async (): Promise<void> => {
    if (!hasSuperAdmin) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      const supabase = createClient()

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      const userId = user?.id

      if (!userId || userError) {
        setError('Authentication session error')
        setRooms([])
        setLoading(false)
        return
      }

      // First, get basic room data
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false })

      if (roomsError) {
        throw roomsError
      }

      if (!roomsData || roomsData.length === 0) {
        setRooms([])
        setLoading(false)
        return
      }

      // Then get stats using RPC function (bypasses RLS issues for stats)
      const { data: statsData, error: statsError } = await supabase.rpc(
        'get_rooms_with_stats'
      )

      if (statsError) {
        throw statsError
      }

      // Create a map of stats by room ID
      const statsMap = new Map<string, Record<string, unknown>>()
      if (statsData) {
        statsData.forEach((stat: Record<string, unknown>) => {
          statsMap.set(stat.id as string, stat)
        })
      }

      // Combine room data with stats
      const roomsWithStats: RoomWithStats[] = roomsData.map((room) => {
        const stats = statsMap.get(room.id) || {}
        return {
          ...room,
          operators: [],
          games: [],
          tournaments: [],
          operator_count: (stats.operator_count as number) || 0,
          total_games: (stats.total_games as number) || 0,
          total_tables: (stats.total_tables as number) || 0,
          total_waitlist_players: (stats.total_waitlist_players as number) || 0,
        }
      })

      setRooms(roomsWithStats)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch rooms')
      setRooms([])
    } finally {
      setLoading(false)
    }
  }, [hasSuperAdmin])

  useEffect(() => {
    // Only fetch rooms when user loading is complete and we have a superAdmin user
    if (!userLoading && hasSuperAdmin) {
      // Add a small delay to ensure session is fully restored
      const timer = setTimeout((): void => {
        fetchRooms()
      }, 200)

      return (): void => clearTimeout(timer)
    } else if (!userLoading && !hasSuperAdmin) {
      // User loading is complete but no superAdmin - stop loading
      setLoading(false)
    }
  }, [userLoading, hasSuperAdmin, fetchRooms])

  const handleCreateRoom = (): void => {
    setCreateDialogOpen(true)
  }

  const handleManageRoom = (room: RoomWithStats): void => {
    setSelectedRoom(room)
    setManageDialogOpen(true)
  }

  const handleRoomUpdated = (): void => {
    fetchRooms()
  }

  if (userLoading || loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loading
          size='md'
          text='Loading...'
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center space-y-4'>
          <div className='text-red-600 font-medium'>
            Error loading dashboard
          </div>
          <div className='text-sm text-muted-foreground'>{error}</div>
          <button
            onClick={() => {
              setError(null)
              fetchRooms()
            }}
            className='px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90'
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Large Superadmin Title */}
      <div className='text-center py-8'>
        <h1 className='text-5xl font-bold tracking-tight mb-2'>Super Admin</h1>
        <div className='w-24 h-1 bg-primary mx-auto rounded-full'></div>
      </div>

      {/* Section Title */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>Room Management</h2>
          <p className='text-muted-foreground'>
            Manage poker room establishments and their staff
          </p>
        </div>
        <Button onClick={handleCreateRoom}>
          <Plus className='h-4 w-4 mr-2' />
          Add Room
        </Button>
      </div>

      {rooms.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <Building2 className='h-12 w-12 text-muted-foreground mb-4' />
            <h3 className='text-lg font-semibold mb-2'>No rooms yet</h3>
            <p className='text-muted-foreground text-center mb-4'>
              Create your first poker room to get started with managing games
              and staff.
            </p>
            <Button onClick={handleCreateRoom}>
              <Plus className='h-4 w-4 mr-2' />
              Create First Room
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {rooms.map((room) => (
            <Card
              key={room.id}
              className='hover:shadow-md transition-shadow'
            >
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <CardTitle className='flex items-center gap-2'>
                    <Building2 className='h-5 w-5' />
                    {room.name}
                  </CardTitle>
                  <Badge variant={room.is_active ? 'default' : 'secondary'}>
                    {room.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className='space-y-4'>
                {/* Staff Preview */}
                {(room.operator_count || 0) > 0 && (
                  <div className='space-y-2'>
                    <div className='text-sm text-muted-foreground'>
                      Staff Members
                    </div>
                    <div className='space-y-1'>
                      <div className='text-sm text-muted-foreground'>
                        {room.operator_count || 0} operator
                        {(room.operator_count || 0) !== 1 ? 's' : ''} assigned
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex-1'
                    onClick={() => handleManageRoom(room)}
                  >
                    <Settings className='h-4 w-4 mr-2' />
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateRoomDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onRoomCreated={handleRoomUpdated}
      />

      <ManageRoomDialog
        open={manageDialogOpen}
        onOpenChange={setManageDialogOpen}
        room={selectedRoom}
        onRoomUpdated={handleRoomUpdated}
      />
    </div>
  )
}
