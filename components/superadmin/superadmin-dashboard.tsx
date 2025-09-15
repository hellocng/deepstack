'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/types/supabase'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Building2,
  Users,
  Settings,
  Gamepad2,
  Calendar,
} from 'lucide-react'
import { CreateRoomDialog } from '@/components/dialogs/create-room-dialog'
import { EditRoomDialog } from '@/components/dialogs/edit-room-dialog'
import { RoomManagementDialog } from '@/components/dialogs/room-management-dialog'

type Room = Tables<'rooms'>
type Operator = Tables<'operators'>
type Game = Tables<'games'>
type Tournament = Tables<'tournaments'>

interface RoomWithStats extends Room {
  operators: Operator[]
  games: Game[]
  tournaments: Tournament[]
}

export function SuperAdminDashboard(): JSX.Element {
  const [rooms, setRooms] = useState<RoomWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [managementDialogOpen, setManagementDialogOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<RoomWithStats | null>(null)

  const fetchRooms = async (): Promise<void> => {
    try {
      const supabase = createClient()

      // Fetch rooms with their operators, games, and tournaments
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select(
          `
          *,
          operators:operators(*),
          games:games(*),
          tournaments:tournaments(*)
        `
        )
        .order('name')

      if (roomsError) throw roomsError

      setRooms(roomsData || [])
    } catch (_error) {
      // Error fetching rooms - handled by error state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  const handleCreateRoom = (): void => {
    setCreateDialogOpen(true)
  }

  const handleEditRoom = (room: RoomWithStats): void => {
    setSelectedRoom(room)
    setEditDialogOpen(true)
  }

  const handleManageRoom = (room: RoomWithStats): void => {
    setSelectedRoom(room)
    setManagementDialogOpen(true)
  }

  const handleRoomUpdated = (): void => {
    fetchRooms()
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-muted-foreground'>Loading rooms...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Room Management</h1>
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
                <CardDescription>{room.description}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {/* Statistics */}
                <div className='grid grid-cols-3 gap-2 text-center'>
                  <div className='space-y-1'>
                    <div className='flex items-center justify-center gap-1 text-sm text-muted-foreground'>
                      <Users className='h-3 w-3' />
                      <span className='text-xs'>Users</span>
                    </div>
                    <p className='text-lg font-semibold'>
                      {room.operators.length}
                    </p>
                  </div>
                  <div className='space-y-1'>
                    <div className='flex items-center justify-center gap-1 text-sm text-muted-foreground'>
                      <Gamepad2 className='h-3 w-3' />
                      <span className='text-xs'>Games</span>
                    </div>
                    <p className='text-lg font-semibold'>{room.games.length}</p>
                  </div>
                  <div className='space-y-1'>
                    <div className='flex items-center justify-center gap-1 text-sm text-muted-foreground'>
                      <Calendar className='h-3 w-3' />
                      <span className='text-xs'>Events</span>
                    </div>
                    <p className='text-lg font-semibold'>
                      {room.tournaments.length}
                    </p>
                  </div>
                </div>

                {/* Staff Preview */}
                {room.operators.length > 0 && (
                  <div className='space-y-2'>
                    <div className='text-sm text-muted-foreground'>
                      Staff Members
                    </div>
                    <div className='space-y-1'>
                      {room.operators.slice(0, 2).map((operator) => (
                        <div
                          key={operator.id}
                          className='text-sm flex items-center justify-between'
                        >
                          <span className='font-medium'>
                            {operator.first_name} {operator.last_name}
                          </span>
                          <Badge
                            variant='outline'
                            className='text-xs'
                          >
                            {operator.role}
                          </Badge>
                        </div>
                      ))}
                      {room.operators.length > 2 && (
                        <div className='text-sm text-muted-foreground'>
                          +{room.operators.length - 2} more
                        </div>
                      )}
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
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex-1'
                    onClick={() => handleEditRoom(room)}
                  >
                    <Building2 className='h-4 w-4 mr-2' />
                    Edit
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

      <EditRoomDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        room={selectedRoom}
        onRoomUpdated={handleRoomUpdated}
      />

      <RoomManagementDialog
        open={managementDialogOpen}
        onOpenChange={setManagementDialogOpen}
        room={selectedRoom}
        onRoomUpdated={handleRoomUpdated}
        onEditRoom={() => {
          setManagementDialogOpen(false)
          setEditDialogOpen(true)
        }}
      />
    </div>
  )
}
