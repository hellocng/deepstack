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

interface CreateRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRoomCreated: () => void
}

export function CreateRoomDialog({
  open,
  onOpenChange,
  onRoomCreated,
}: CreateRoomDialogProps): JSX.Element {
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
    setIsLoading(true)

    try {
      const supabase = createClient()

      // Check if room code already exists
      const { data: existingRoom } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', formData.code)
        .single()

      if (existingRoom) {
        toast.error('Room code already exists. Please choose a different code.')
        return
      }

      // Create the room
      const { data: _data, error } = await supabase
        .from('rooms')
        .insert([
          {
            name: formData.name,
            code: formData.code,
            description: formData.description || null,
            website_url: formData.website_url || null,
            contact_email: formData.contact_email || null,
            address: formData.address || null,
            phone: formData.phone || null,
            is_active: true,
          },
        ] as any)
        .select()
        .single()

      if (error) {
        // Error creating room - handled by error state
        toast.error('Failed to create room. Please try again.')
        return
      }

      toast.success(`Room "${formData.name}" created successfully!`)
      onOpenChange(false)
      onRoomCreated()
    } catch (_error) {
      // Error creating room - handled by error state
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Create New Room</DialogTitle>
          <DialogDescription>
            Create a new poker room with basic information and contact details.
          </DialogDescription>
        </DialogHeader>
        <RoomForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
          submitLabel='Create Room'
        />
      </DialogContent>
    </Dialog>
  )
}
