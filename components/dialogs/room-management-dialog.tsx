'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Tables, TablesUpdate } from '@/types'
import {
  Building2,
  Users,
  Gamepad2,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Globe,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit,
  AlertTriangle,
} from 'lucide-react'

type Room = Tables<'rooms'>
type Operator = Tables<'operators'>
type Game = Tables<'games'>
type Tournament = Tables<'tournaments'>

interface RoomWithStats extends Room {
  operators: Operator[]
  games: Game[]
  tournaments: Tournament[]
}

interface RoomManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: RoomWithStats | null
  onRoomUpdated: () => void
  onEditRoom: () => void
}

export function RoomManagementDialog({
  open,
  onOpenChange,
  room,
  onRoomUpdated,
  onEditRoom,
}: RoomManagementDialogProps): JSX.Element | null {
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleStatus = async (): Promise<void> => {
    if (!room) return

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('rooms')
        .update({
          is_active: !room.is_active,
          updated_at: new Date().toISOString(),
        } as TablesUpdate<'rooms'>)
        .eq('id', room.id)

      if (error) {
        // Error updating room status - handled by error state
        toast.error('Failed to update room status. Please try again.')
        return
      }

      toast.success(
        `Room ${!room.is_active ? 'activated' : 'deactivated'} successfully!`
      )
      onRoomUpdated()
    } catch (_error) {
      // Error updating room status - handled by error state
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRoom = async (): Promise<void> => {
    if (!room) return

    // Check if room has active games or operators
    if (room.games.length > 0 || room.operators.length > 0) {
      toast.error(
        'Cannot delete room with active games or operators. Please remove them first.'
      )
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${room.name}"? This action cannot be undone.`
    )

    if (!confirmed) return

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from('rooms').delete().eq('id', room.id)

      if (error) {
        // Error deleting room - handled by error state
        toast.error('Failed to delete room. Please try again.')
        return
      }

      toast.success(`Room "${room.name}" deleted successfully!`)
      onOpenChange(false)
      onRoomUpdated()
    } catch (_error) {
      // Error deleting room - handled by error state
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!room) return null

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Building2 className='h-5 w-5' />
            {room.name}
            <Badge variant={room.is_active ? 'default' : 'secondary'}>
              {room.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            View and manage room details, statistics, and settings.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Room Information */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold'>Room Information</h3>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <Building2 className='h-4 w-4' />
                  <span>Code</span>
                </div>
                <p className='font-mono text-sm bg-muted px-2 py-1 rounded'>
                  {room.code}
                </p>
              </div>

              {room.description && (
                <div className='space-y-2 md:col-span-2'>
                  <div className='text-sm text-muted-foreground'>
                    Description
                  </div>
                  <p className='text-sm'>{room.description}</p>
                </div>
              )}
            </div>

            {/* Contact Information */}
            {(room.contact_email ||
              room.phone ||
              room.website_url ||
              room.address) && (
              <div className='space-y-3'>
                <h4 className='font-medium'>Contact Information</h4>
                <div className='grid gap-3 md:grid-cols-2'>
                  {room.contact_email && (
                    <div className='flex items-center gap-2 text-sm'>
                      <Mail className='h-4 w-4 text-muted-foreground' />
                      <span>{room.contact_email}</span>
                    </div>
                  )}
                  {room.phone && (
                    <div className='flex items-center gap-2 text-sm'>
                      <Phone className='h-4 w-4 text-muted-foreground' />
                      <span>{room.phone}</span>
                    </div>
                  )}
                  {room.website_url && (
                    <div className='flex items-center gap-2 text-sm'>
                      <Globe className='h-4 w-4 text-muted-foreground' />
                      <a
                        href={room.website_url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-primary hover:underline'
                      >
                        {room.website_url}
                      </a>
                    </div>
                  )}
                  {room.address && (
                    <div className='flex items-center gap-2 text-sm md:col-span-2'>
                      <MapPin className='h-4 w-4 text-muted-foreground' />
                      <span>{room.address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Statistics */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold'>Statistics</h3>

            <div className='grid gap-4 md:grid-cols-3'>
              <div className='flex items-center gap-3 p-3 bg-muted rounded-lg'>
                <Users className='h-5 w-5 text-muted-foreground' />
                <div>
                  <p className='text-sm text-muted-foreground'>Staff</p>
                  <p className='text-lg font-semibold'>
                    {room.operators.length}
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-3 p-3 bg-muted rounded-lg'>
                <Gamepad2 className='h-5 w-5 text-muted-foreground' />
                <div>
                  <p className='text-sm text-muted-foreground'>Games</p>
                  <p className='text-lg font-semibold'>{room.games.length}</p>
                </div>
              </div>

              <div className='flex items-center gap-3 p-3 bg-muted rounded-lg'>
                <Calendar className='h-5 w-5 text-muted-foreground' />
                <div>
                  <p className='text-sm text-muted-foreground'>Tournaments</p>
                  <p className='text-lg font-semibold'>
                    {room.tournaments.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold'>Actions</h3>

            <div className='flex flex-wrap gap-3'>
              <Button
                variant='outline'
                onClick={onEditRoom}
                disabled={isLoading}
              >
                <Edit className='h-4 w-4 mr-2' />
                Edit Room
              </Button>

              <Button
                variant='outline'
                onClick={handleToggleStatus}
                disabled={isLoading}
              >
                {room.is_active ? (
                  <>
                    <ToggleLeft className='h-4 w-4 mr-2' />
                    Deactivate
                  </>
                ) : (
                  <>
                    <ToggleRight className='h-4 w-4 mr-2' />
                    Activate
                  </>
                )}
              </Button>

              <Button
                variant='destructive'
                onClick={handleDeleteRoom}
                disabled={
                  isLoading ||
                  room.games.length > 0 ||
                  room.operators.length > 0
                }
              >
                <Trash2 className='h-4 w-4 mr-2' />
                Delete
              </Button>
            </div>

            {(room.games.length > 0 || room.operators.length > 0) && (
              <div className='flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg'>
                <AlertTriangle className='h-4 w-4 text-yellow-600 dark:text-yellow-400' />
                <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                  Cannot delete room with active games or operators. Remove them
                  first.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
