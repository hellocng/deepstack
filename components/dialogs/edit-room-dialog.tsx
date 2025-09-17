'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RoomForm } from '@/components/forms/room-form'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Tables, TablesUpdate } from '@/types'

type Room = Tables<'rooms'>

interface EditRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: Room | null
  onRoomUpdated: () => void
}

export function EditRoomDialog({
  open,
  onOpenChange,
  room,
  onRoomUpdated,
}: EditRoomDialogProps): JSX.Element | null {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (formData: {
    name: string
    code: string
    description?: string
    website_url?: string
    contact_email?: string
    address?: string
    phone?: string
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
          description: formData.description || null,
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

  if (!room) return null

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Edit Room</DialogTitle>
          <DialogDescription>
            Update the room information and contact details.
          </DialogDescription>
        </DialogHeader>
        <RoomForm
          initialData={{
            name: room.name,
            code: room.code,
            description: room.description || '',
            website_url: room.website_url || '',
            contact_email: room.contact_email || '',
            address: room.address || '',
            phone: room.phone || '',
          }}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
          submitLabel='Update Room'
        />
      </DialogContent>
    </Dialog>
  )
}
