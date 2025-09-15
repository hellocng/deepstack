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
import { Plus, Building2, Users, Settings } from 'lucide-react'

type Room = Tables<'rooms'>
type Operator = Tables<'operators'>

interface RoomWithOperators extends Room {
  operators: Operator[]
}

export function SuperAdminDashboard(): JSX.Element {
  const [rooms, setRooms] = useState<RoomWithOperators[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRooms = async (): Promise<void> => {
      try {
        const supabase = createClient()

        // Fetch rooms with their operators
        const { data: roomsData, error: roomsError } = await supabase
          .from('rooms')
          .select(
            `
            *,
            operators:operators(*)
          `
          )
          .order('name')

        if (roomsError) throw roomsError

        setRooms(roomsData || [])
      } catch (error) {
        console.error('Error fetching rooms:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRooms()
  }, [])

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
        <Button>
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
            <Button>
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
                <div className='space-y-2'>
                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Users className='h-4 w-4' />
                    <span>
                      {room.operators.length} staff member
                      {room.operators.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {room.operators.length > 0 && (
                    <div className='space-y-1'>
                      {room.operators.slice(0, 3).map((operator) => (
                        <div
                          key={operator.id}
                          className='text-sm'
                        >
                          <span className='font-medium'>
                            {operator.first_name} {operator.last_name}
                          </span>
                          <Badge
                            variant='outline'
                            className='ml-2 text-xs'
                          >
                            {operator.role}
                          </Badge>
                        </div>
                      ))}
                      {room.operators.length > 3 && (
                        <div className='text-sm text-muted-foreground'>
                          +{room.operators.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex-1'
                  >
                    <Settings className='h-4 w-4 mr-2' />
                    Manage
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex-1'
                  >
                    <Users className='h-4 w-4 mr-2' />
                    Staff
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
