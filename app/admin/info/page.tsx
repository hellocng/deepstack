'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useOperator } from '@/lib/auth/user-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loading } from '@/components/ui/loading'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

const roomFormSchema = z.object({
  name: z.string().min(1, 'Room name is required'),
  code: z.string().min(1, 'Room code is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  website_url: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  contact_email: z
    .string()
    .email('Must be a valid email')
    .optional()
    .or(z.literal('')),
  is_active: z.boolean(),
})

type RoomFormData = z.infer<typeof roomFormSchema>

export default function RoomInfoPage(): JSX.Element {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [roomData, setRoomData] = useState<RoomFormData | null>(null)
  const [checkingCode, setCheckingCode] = useState(false)
  const operator = useOperator()
  const router = useRouter()

  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      phone: '',
      website_url: '',
      contact_email: '',
      is_active: true,
    },
  })

  const checkRoomCodeUniqueness = async (code: string): Promise<void> => {
    if (!code || !operator?.profile?.room_id) return

    setCheckingCode(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', code)
        .neq('id', operator.profile.room_id) // Exclude current room
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" which is what we want
        console.error('Error checking room code:', error)
        return
      }

      if (data) {
        form.setError('code', {
          type: 'manual',
          message: 'This room code is already taken',
        })
      } else {
        // Clear any existing error if code is unique
        form.clearErrors('code')
      }
    } catch (error) {
      console.error('Error checking room code:', error)
    } finally {
      setCheckingCode(false)
    }
  }

  useEffect(() => {
    const fetchRoomData = async (): Promise<void> => {
      if (!operator?.profile?.room_id) return

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', operator.profile.room_id)
          .single()

        if (error) {
          console.error('Error fetching room data:', error)
          return
        }

        if (data) {
          const formData: RoomFormData = {
            name: data.name || '',
            code: data.code || '',
            address: data.address || '',
            phone: data.phone || '',
            website_url: data.website_url || '',
            contact_email: data.contact_email || '',
            is_active: data.is_active ?? true,
          }
          setRoomData(formData)
          form.reset(formData)
        }
      } catch (error) {
        console.error('Error fetching room data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRoomData()
  }, [operator, form])

  const onSubmit = async (data: RoomFormData): Promise<void> => {
    if (!operator?.profile?.room_id) return

    setSaving(true)
    try {
      const supabase = createClient()

      // Convert empty strings to null for optional fields
      const updateData = {
        name: data.name,
        code: data.code,
        address: data.address || null,
        phone: data.phone || null,
        website_url: data.website_url || null,
        contact_email: data.contact_email || null,
        is_active: data.is_active,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', operator.profile.room_id)

      if (error) {
        console.error('Error updating room:', error)
        return
      }

      // Redirect back to admin dashboard
      router.push('../')
    } catch (error) {
      console.error('Error updating room:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = (): void => {
    router.push('../')
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loading
          size='md'
          text='Loading room information...'
        />
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header with back button */}
      <div className='flex items-center gap-4'>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8'
          onClick={() => router.back()}
        >
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <h1 className='text-3xl font-bold tracking-tight'>Room Information</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Room Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-6'
          >
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='name'>Room Name *</Label>
                <Input
                  id='name'
                  {...form.register('name')}
                />
                {form.formState.errors.name && (
                  <p className='text-sm text-destructive'>
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='code'>Room Code *</Label>
                <Input
                  id='code'
                  {...form.register('code')}
                  onBlur={(e) => {
                    const code = e.target.value.trim()
                    if (code && code !== roomData?.code) {
                      checkRoomCodeUniqueness(code)
                    }
                  }}
                />
                {checkingCode && (
                  <p className='text-sm text-muted-foreground'>
                    Checking availability...
                  </p>
                )}
                {form.formState.errors.code && (
                  <p className='text-sm text-destructive'>
                    {form.formState.errors.code.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='address'>Address</Label>
                <Input
                  id='address'
                  {...form.register('address')}
                />
                {form.formState.errors.address && (
                  <p className='text-sm text-destructive'>
                    {form.formState.errors.address.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='phone'>Phone</Label>
                <Input
                  id='phone'
                  {...form.register('phone')}
                />
                {form.formState.errors.phone && (
                  <p className='text-sm text-destructive'>
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='website_url'>Website URL</Label>
                <Input
                  id='website_url'
                  {...form.register('website_url')}
                />
                {form.formState.errors.website_url && (
                  <p className='text-sm text-destructive'>
                    {form.formState.errors.website_url.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='contact_email'>Contact Email</Label>
                <Input
                  id='contact_email'
                  type='email'
                  {...form.register('contact_email')}
                />
                {form.formState.errors.contact_email && (
                  <p className='text-sm text-destructive'>
                    {form.formState.errors.contact_email.message}
                  </p>
                )}
              </div>
            </div>

            <div className='flex items-center space-x-2'>
              <Switch
                id='is_active'
                checked={form.watch('is_active')}
                onCheckedChange={(checked) =>
                  form.setValue('is_active', checked)
                }
              />
              <Label htmlFor='is_active'>Room is active</Label>
            </div>

            <div className='flex gap-4 pt-4 justify-end'>
              <Button
                type='button'
                variant='outline'
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
