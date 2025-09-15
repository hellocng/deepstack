'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Badge } from '@/components/ui/badge' // Unused import
import { Building2, Globe, Mail, MapPin, Phone, Hash } from 'lucide-react'

const roomFormSchema = z.object({
  name: z.string().min(1, 'Room name is required'),
  code: z
    .string()
    .min(1, 'Room code is required')
    .regex(
      /^[a-z0-9-]+$/,
      'Room code must contain only lowercase letters, numbers, and hyphens'
    ),
  description: z.string().optional(),
  website_url: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^https?:\/\/.+/.test(val),
      'Please enter a valid URL starting with http:// or https://'
    ),
  contact_email: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      'Please enter a valid email address'
    ),
  address: z.string().optional(),
  phone: z.string().optional(),
})

type RoomFormData = z.infer<typeof roomFormSchema>

interface RoomFormProps {
  initialData?: Partial<RoomFormData>
  onSubmit: (data: RoomFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  submitLabel?: string
}

export function RoomForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Create Room',
}: RoomFormProps): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      code: initialData?.code || '',
      description: initialData?.description || '',
      website_url: initialData?.website_url || '',
      contact_email: initialData?.contact_email || '',
      address: initialData?.address || '',
      phone: initialData?.phone || '',
    },
  })

  const watchedCode = watch('code')

  const onFormSubmit = async (data: RoomFormData): Promise<void> => {
    try {
      await onSubmit(data)
    } catch (_error) {
      // Error submitting form - handled by error state
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className='space-y-6'
    >
      <div className='grid gap-6 md:grid-cols-2'>
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Building2 className='h-5 w-5' />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
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

            <div className='space-y-2'>
              <Label htmlFor='description'>Description</Label>
              <textarea
                id='description'
                {...register('description')}
                placeholder='Brief description of the poker room...'
                className='w-full min-h-[80px] px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Phone className='h-5 w-5' />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='contact_email'>Contact Email</Label>
              <div className='flex items-center gap-2'>
                <Mail className='h-4 w-4 text-muted-foreground' />
                <Input
                  id='contact_email'
                  type='email'
                  {...register('contact_email')}
                  placeholder='contact@room.com'
                  className={errors.contact_email ? 'border-red-500' : ''}
                />
              </div>
              {errors.contact_email && (
                <p className='text-sm text-red-500'>
                  {errors.contact_email.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='phone'>Phone Number</Label>
              <div className='flex items-center gap-2'>
                <Phone className='h-4 w-4 text-muted-foreground' />
                <Input
                  id='phone'
                  {...register('phone')}
                  placeholder='+1-555-0123'
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='website_url'>Website URL</Label>
              <div className='flex items-center gap-2'>
                <Globe className='h-4 w-4 text-muted-foreground' />
                <Input
                  id='website_url'
                  {...register('website_url')}
                  placeholder='https://www.room.com'
                  className={errors.website_url ? 'border-red-500' : ''}
                />
              </div>
              {errors.website_url && (
                <p className='text-sm text-red-500'>
                  {errors.website_url.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='address'>Address</Label>
              <div className='flex items-center gap-2'>
                <MapPin className='h-4 w-4 text-muted-foreground' />
                <Input
                  id='address'
                  {...register('address')}
                  placeholder='123 Main St, City, State'
                />
              </div>
            </div>
          </CardContent>
        </Card>
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
          {isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
