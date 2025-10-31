'use client'

import { useState, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { TablesInsert, Database } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Room = Database['public']['Tables']['rooms']['Row']

const createOperatorSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'supervisor', 'dealer', 'superadmin']),
  roomId: z.string().optional(),
})

type CreateOperatorFormData = z.infer<typeof createOperatorSchema>

interface CreateOperatorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOperatorCreated: () => void
}

export function CreateOperatorDialog({
  open,
  onOpenChange,
  onOperatorCreated,
}: CreateOperatorDialogProps): JSX.Element {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rooms, setRooms] = useState<Room[]>([])

  const form = useForm<CreateOperatorFormData>({
    resolver: zodResolver(createOperatorSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'dealer',
      roomId: '',
    },
  })

  useEffect(() => {
    if (open) {
      const fetchRooms = async (): Promise<void> => {
        try {
          const supabase = createClient()
          const { data: roomsData, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('is_active', true)
            .order('name')

          if (error) {
            // Error fetching rooms - handled by error state
            return
          }

          setRooms(roomsData || [])
        } catch (_error) {
          // Error fetching rooms - handled by error state
        }
      }

      fetchRooms()
    }
  }, [open])

  const onSubmit = async (data: CreateOperatorFormData): Promise<void> => {
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // Create the auth user first
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: data.email,
          password: data.password,
          email_confirm: true, // Auto-confirm email
        })

      if (authError) {
        throw authError
      }

      if (!authData.user) {
        throw new Error('Failed to create user')
      }

      // Create the operator record
      const operatorData: TablesInsert<'operators'> = {
        role: data.role,
        room_id: data.role === 'superadmin' ? null : data.roomId,
        auth_id: authData.user.id,
        is_active: true,
      }

      const { error: operatorError } = await supabase
        .from('operators')
        .insert(operatorData as TablesInsert<'operators'>)

      if (operatorError) {
        // If operator creation fails, we should clean up the auth user
        await supabase.auth.admin.deleteUser(authData.user.id)
        throw operatorError
      }

      // Success
      form.reset()
      onOperatorCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create operator')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Create New Operator</DialogTitle>
          <DialogDescription>
            Create a new operator account and assign them to a room.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-4'
        >
          <FieldGroup>
            <Controller
              name='email'
              control={form.control}
              render={({ field, fieldState }): JSX.Element => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='email'>Email</FieldLabel>
                  <Input
                    id='email'
                    type='email'
                    placeholder='operator@example.com'
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name='password'
              control={form.control}
              render={({ field, fieldState }): JSX.Element => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='password'>Password</FieldLabel>
                  <Input
                    id='password'
                    type='password'
                    placeholder='Enter password'
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name='role'
              control={form.control}
              render={({ field, fieldState }): JSX.Element => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='role'>Role</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder='Select a role' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='dealer'>Dealer</SelectItem>
                      <SelectItem value='supervisor'>Supervisor</SelectItem>
                      <SelectItem value='admin'>Admin</SelectItem>
                      <SelectItem value='superadmin'>Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {form.watch('role') !== 'superadmin' && (
              <Controller
                name='roomId'
                control={form.control}
                render={({ field, fieldState }): JSX.Element => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor='roomId'>Room</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder='Select a room' />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem
                            key={room.id}
                            value={room.id}
                          >
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            )}
          </FieldGroup>

          {error && (
            <div className='text-sm text-destructive text-center py-2'>
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Operator'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
