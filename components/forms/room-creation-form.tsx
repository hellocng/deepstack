'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Hash } from 'lucide-react'

const roomCreationSchema = z.object({
  name: z.string().min(1, 'Room name is required'),
  code: z
    .string()
    .min(1, 'Room code is required')
    .regex(
      /^[a-z0-9-]+$/,
      'Room code must contain only lowercase letters, numbers, and hyphens'
    ),
})

type RoomCreationFormData = z.infer<typeof roomCreationSchema>

interface RoomCreationFormProps {
  initialData?: Partial<RoomCreationFormData>
  onSubmit: (data: RoomCreationFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  submitLabel?: string
}

export function RoomCreationForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Create Room',
}: RoomCreationFormProps): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RoomCreationFormData>({
    resolver: zodResolver(roomCreationSchema),
    defaultValues: {
      name: initialData?.name || '',
      code: initialData?.code || '',
    },
  })

  const watchedCode = watch('code')

  const onFormSubmit = async (data: RoomCreationFormData): Promise<void> => {
    try {
      await onSubmit(data)
    } catch (_error) {
      // Error submitting form - handled by error state
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className='space-y-4'
    >
      <div className='space-y-2'>
        <Label htmlFor='name'>Room Name *</Label>
        <Input
          id='name'
          {...register('name')}
          placeholder='e.g., The Royal Flush'
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className='text-sm text-red-500'>{errors.name.message}</p>
        )}
      </div>

      <div className='space-y-2'>
        <Label htmlFor='code'>Room Code *</Label>
        <div className='flex items-center gap-2'>
          <Hash className='h-4 w-4 text-muted-foreground' />
          <Input
            id='code'
            {...register('code', {
              onChange: (e) => {
                e.target.value = e.target.value.toLowerCase()
              },
            })}
            placeholder='e.g., royal-flush'
            className={errors.code ? 'border-red-500' : ''}
          />
        </div>
        {errors.code && (
          <p className='text-sm text-red-500'>{errors.code.message}</p>
        )}
        <p className='text-xs text-muted-foreground'>
          Used in URLs: /{watchedCode || 'room-code'}
        </p>
      </div>

      {/* Form Actions */}
      <div className='flex justify-end gap-3'>
        <Button
          type='button'
          variant='outline'
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type='submit'
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
