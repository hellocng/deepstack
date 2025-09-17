'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Hash } from 'lucide-react'

const roomBasicSchema = z.object({
  name: z.string().min(1, 'Room name is required'),
  code: z
    .string()
    .min(1, 'Room code is required')
    .regex(
      /^[a-z0-9-]+$/,
      'Room code must contain only lowercase letters, numbers, and hyphens'
    ),
})

type RoomBasicFormData = z.infer<typeof roomBasicSchema>

interface RoomBasicFormProps {
  initialData?: Partial<RoomBasicFormData>
  onSubmit: (data: RoomBasicFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  submitLabel?: string
  showActions?: boolean
}

export function RoomBasicForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Update Room',
  showActions = true,
}: RoomBasicFormProps): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RoomBasicFormData>({
    resolver: zodResolver(roomBasicSchema),
    defaultValues: {
      name: initialData?.name || '',
      code: initialData?.code || '',
    },
  })

  const watchedCode = watch('code')

  const onFormSubmit = async (data: RoomBasicFormData): Promise<void> => {
    try {
      await onSubmit(data)
    } catch (_error) {
      // Error submitting form - handled by error state
    }
  }

  return (
    <form
      id='room-basic-form'
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
      {showActions && (
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
            {isLoading ? 'Updating...' : submitLabel}
          </Button>
        </div>
      )}
    </form>
  )
}
