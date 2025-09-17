'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RoomForm } from '@/components/forms/room-form'
import { RoomBasicForm } from '@/components/forms/room-basic-form'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Tables, TablesUpdate } from '@/types'
import { useRoomAdmin, useSuperAdmin } from '@/lib/auth/user-context'
import {
  getRoomIPRestrictions,
  upsertRoomIPRestrictions,
} from '@/lib/room-ip-restrictions'
import { Building2, Trash2, Power, PowerOff } from 'lucide-react'

type Room = Tables<'rooms'>

interface ManageRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: Room | null
  onRoomUpdated: () => void
}

export function ManageRoomDialog({
  open,
  onOpenChange,
  room,
  onRoomUpdated,
}: ManageRoomDialogProps): JSX.Element | null {
  const [isLoading, setIsLoading] = useState(false)
  const [ipRestrictions, setIpRestrictions] = useState<{
    ip_restriction_enabled: boolean
    allowed_ips: string[]
  } | null>(null)
  const roomAdmin = useRoomAdmin()
  const superAdmin = useSuperAdmin()

  // Load IP restrictions when dialog opens and user is a room admin
  useEffect(() => {
    const loadIPRestrictions = async (): Promise<void> => {
      if (!room || !roomAdmin || !open) {
        setIpRestrictions(null)
        return
      }

      try {
        const supabase = createClient()
        const restrictions = await getRoomIPRestrictions(supabase, room.id)

        if (restrictions) {
          setIpRestrictions({
            ip_restriction_enabled:
              restrictions.ip_restriction_enabled || false,
            allowed_ips: restrictions.allowed_ips || [],
          })
        } else {
          setIpRestrictions({
            ip_restriction_enabled: false,
            allowed_ips: [],
          })
        }
      } catch (error) {
        console.error('Failed to load IP restrictions:', error)
        setIpRestrictions({
          ip_restriction_enabled: false,
          allowed_ips: [],
        })
      }
    }

    loadIPRestrictions()
  }, [room, roomAdmin, open])

  const handleBasicSubmit = async (formData: {
    name: string
    code: string
  }): Promise<void> => {
    if (!room) return

    setIsLoading(true)

    try {
      const supabase = createClient()

      // Check if room code already exists (excluding current room)
      if (formData.code !== room.code) {
        const { data: existingRoom } = await supabase
          .from('rooms')
          .select('id')
          .eq('code', formData.code)
          .neq('id', room.id)
          .single()

        if (existingRoom) {
          toast.error(
            'Room code already exists. Please choose a different code.'
          )
          return
        }
      }

      // Update the room
      const { error } = await supabase
        .from('rooms')
        .update({
          name: formData.name,
          code: formData.code,
          updated_at: new Date().toISOString(),
        } as TablesUpdate<'rooms'>)
        .eq('id', room.id)

      if (error) {
        toast.error('Failed to update room. Please try again.')
        return
      }

      toast.success(`Room "${formData.name}" updated successfully!`)
      onOpenChange(false)
      onRoomUpdated()
    } catch (_error) {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (formData: {
    name: string
    code: string
    website_url?: string
    contact_email?: string
    address?: string
    phone?: string
    ip_restriction_enabled?: boolean
    allowed_ips?: string[]
  }): Promise<void> => {
    if (!room) return

    setIsLoading(true)

    try {
      const supabase = createClient()

      // Check if room code already exists (excluding current room)
      if (formData.code !== room.code) {
        const { data: existingRoom } = await supabase
          .from('rooms')
          .select('id')
          .eq('code', formData.code)
          .neq('id', room.id)
          .single()

        if (existingRoom) {
          toast.error(
            'Room code already exists. Please choose a different code.'
          )
          return
        }
      }

      // Update the room
      const { error } = await supabase
        .from('rooms')
        .update({
          name: formData.name,
          code: formData.code,
          website_url: formData.website_url || null,
          contact_email: formData.contact_email || null,
          address: formData.address || null,
          phone: formData.phone || null,
          updated_at: new Date().toISOString(),
        } as TablesUpdate<'rooms'>)
        .eq('id', room.id)

      if (error) {
        // Error updating room - handled by error state
        toast.error('Failed to update room. Please try again.')
        return
      }

      // Update IP restrictions if user is a room admin and IP restrictions were provided
      if (
        roomAdmin &&
        formData.ip_restriction_enabled !== undefined &&
        formData.allowed_ips !== undefined
      ) {
        const supabase = createClient()
        const result = await upsertRoomIPRestrictions(supabase, room.id, {
          ip_restriction_enabled: formData.ip_restriction_enabled,
          allowed_ips: formData.allowed_ips,
        })

        if (!result.success) {
          toast.error(
            `Room updated but failed to update IP restrictions: ${result.error}`
          )
          return
        }
      }

      toast.success(`Room "${formData.name}" updated successfully!`)
      onOpenChange(false)
      onRoomUpdated()
    } catch (_error) {
      // Error updating room - handled by error state
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

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
        toast.error('Failed to update room status. Please try again.')
        return
      }

      toast.success(
        `Room ${!room.is_active ? 'activated' : 'deactivated'} successfully!`
      )
      onRoomUpdated()
    } catch (_error) {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRoom = async (): Promise<void> => {
    if (!room) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${room.name}"? This action cannot be undone and will remove all associated data.`
    )

    if (!confirmed) return

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from('rooms').delete().eq('id', room.id)

      if (error) {
        toast.error('Failed to delete room. Please try again.')
        return
      }

      toast.success(`Room "${room.name}" deleted successfully!`)
      onOpenChange(false)
      onRoomUpdated()
    } catch (_error) {
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
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Building2 className='h-5 w-5' />
            Manage Room
            <Badge variant={room.is_active ? 'default' : 'secondary'}>
              {room.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        {superAdmin ? (
          <RoomBasicForm
            initialData={{
              name: room.name,
              code: room.code,
            }}
            onSubmit={handleBasicSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={isLoading}
            submitLabel='Update Room'
            showActions={false}
          />
        ) : (
          <RoomForm
            initialData={{
              name: room.name,
              code: room.code,
              website_url: room.website_url || '',
              contact_email: room.contact_email || '',
              address: room.address || '',
              phone: room.phone || '',
              ip_restriction_enabled:
                ipRestrictions?.ip_restriction_enabled || false,
              allowed_ips: ipRestrictions?.allowed_ips || [],
            }}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={isLoading}
            submitLabel='Update Room'
            showSecuritySettings={!!roomAdmin}
            showActions={false}
          />
        )}

        {/* Action Buttons */}
        <div className='flex justify-between gap-3 pt-6 border-t'>
          <div className='flex gap-2'>
            <Button
              variant={room.is_active ? 'destructive' : 'default'}
              onClick={handleToggleStatus}
              disabled={isLoading}
            >
              {room.is_active ? (
                <>
                  <PowerOff className='h-4 w-4 mr-2' />
                  Deactivate
                </>
              ) : (
                <>
                  <Power className='h-4 w-4 mr-2' />
                  Activate
                </>
              )}
            </Button>
            <Button
              variant='destructive'
              onClick={handleDeleteRoom}
              disabled={isLoading}
            >
              <Trash2 className='h-4 w-4 mr-2' />
              Delete
            </Button>
          </div>
          <div className='flex gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              form={superAdmin ? 'room-basic-form' : 'room-form'}
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Room'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
