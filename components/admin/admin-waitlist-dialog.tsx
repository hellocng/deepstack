'use client'

import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loading } from '@/components/ui/loading'
import { UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Game = Database['public']['Tables']['games']['Row']
type Room = Database['public']['Tables']['rooms']['Row']

const adminWaitlistSchema = z.object({
  alias: z.string().min(1, 'Please enter an alias'),
  phone: z.string().optional(),
  selectedGames: z.array(z.string()).min(1, 'Please select at least one game'),
  notes: z.string().optional(),
  checkInImmediately: z.boolean().optional(),
})

type AdminWaitlistData = z.infer<typeof adminWaitlistSchema>

interface AdminWaitlistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  games: Game[]
  room: Room
  onJoined: () => void
}

export function AdminWaitlistDialog({
  open,
  onOpenChange,
  games,
  room,
  onJoined,
}: AdminWaitlistDialogProps): JSX.Element {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<AdminWaitlistData>({
    resolver: zodResolver(adminWaitlistSchema),
    defaultValues: {
      alias: '',
      phone: '',
      selectedGames: [],
      notes: '',
      checkInImmediately: false,
    },
  })

  const onSubmit = async (data: AdminWaitlistData): Promise<void> => {
    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()

      // Create or find player
      let playerId: string

      if (data.phone?.trim()) {
        // Look for existing player by phone
        const { data: authUsers, error: authError } =
          await supabase.auth.admin.listUsers()

        if (authError) {
          throw new Error('Failed to lookup existing user')
        }

        const userWithPhone = authUsers.users.find(
          (user) =>
            user.user_metadata?.phone === data.phone ||
            user.phone === data.phone
        )

        if (userWithPhone) {
          // Find existing player
          const { data: existingPlayer, error: playerError } = await supabase
            .from('players')
            .select('id, phone_number')
            .eq('auth_id', userWithPhone.id)
            .single()

          if (playerError || !existingPlayer) {
            throw new Error('Failed to find existing player')
          }

          playerId = existingPlayer.id

          // Update alias if changed
          if (data.alias !== userWithPhone.user_metadata?.alias) {
            await supabase
              .from('players')
              .update({ alias: data.alias })
              .eq('id', playerId)
          }

          // Store phone number on player record if missing
          if (existingPlayer.phone_number !== (data.phone || null)) {
            await supabase
              .from('players')
              .update({ phone_number: data.phone || null })
              .eq('id', playerId)
          }
        } else {
          // Create new auth user and player
          const { data: authData, error: authError } =
            await supabase.auth.admin.createUser({
              phone: data.phone,
              user_metadata: { alias: data.alias },
            })

          if (authError) {
            throw new Error('Failed to create user')
          }

          const { data: newPlayer, error: playerError } = await supabase
            .from('players')
            .insert({
              auth_id: authData.user.id,
              alias: data.alias,
              phone_number: data.phone,
            })
            .select('id')
            .single()

          if (playerError || !newPlayer) {
            throw new Error('Failed to create player')
          }

          playerId = newPlayer.id
        }
      } else {
        // Create player without auth user
        const { data: newPlayer, error: playerError } = await supabase
          .from('players')
          .insert({ alias: data.alias, phone_number: data.phone || null })
          .select('id')
          .single()

        if (playerError || !newPlayer) {
          throw new Error('Failed to create player')
        }

        playerId = newPlayer.id
      }

      // Create separate waitlist entries for each game
      const entries: Database['public']['Tables']['waitlist_entries']['Insert'][] =
        data.selectedGames.map((gameId) => ({
          player_id: playerId,
          game_id: gameId,
          room_id: room.id,
          status: (data.checkInImmediately
            ? 'waiting'
            : 'calledin') as Database['public']['Enums']['waitlist_status'],
          notes: data.notes || null,
          entry_method: 'inperson',
          checked_in_at: data.checkInImmediately
            ? new Date().toISOString()
            : null,
        }))

      const { error: insertError } = await supabase
        .from('waitlist_entries')
        .insert(entries)

      if (insertError) {
        throw new Error(insertError.message)
      }

      onJoined()
      onOpenChange(false)
      form.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const availableGames = games.filter((game) => game.is_active)

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='mb-4'>
          <DialogTitle className='flex items-center gap-2'>
            <UserPlus className='h-5 w-5' />
            Add to Waitlist
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-8'
        >
          <FieldGroup>
            {/* Player Info */}
            <div className='grid gap-4 md:grid-cols-2'>
              <Controller
                name='alias'
                control={form.control}
                render={({ field, fieldState }): JSX.Element => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor='alias'>Alias</FieldLabel>
                    <Input
                      id='alias'
                      placeholder='Enter player alias'
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
                name='phone'
                control={form.control}
                render={({ field, fieldState }): JSX.Element => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor='phone'>Phone Number</FieldLabel>
                    <Input
                      id='phone'
                      type='tel'
                      placeholder='Enter phone number'
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            {/* Game Selection */}
            <Controller
              name='selectedGames'
              control={form.control}
              render={({ field, fieldState }): JSX.Element => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Select Games</FieldLabel>
                  <div className='grid gap-4 md:grid-cols-2'>
                    {availableGames.map((game) => (
                      <div
                        key={game.id}
                        className='flex items-center space-x-2'
                      >
                        <Checkbox
                          id={game.id}
                          checked={field.value.includes(game.id)}
                          onCheckedChange={(checked): void => {
                            const current = field.value
                            if (checked) {
                              field.onChange([...current, game.id])
                            } else {
                              field.onChange(
                                current.filter((id) => id !== game.id)
                              )
                            }
                          }}
                          aria-invalid={fieldState.invalid}
                        />
                        <div className='flex-1 min-w-0'>
                          <label
                            htmlFor={game.id}
                            className='text-sm font-medium cursor-pointer'
                          >
                            {game.name}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Notes */}
            <Controller
              name='notes'
              control={form.control}
              render={({ field, fieldState }): JSX.Element => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='notes'>Notes (Optional)</FieldLabel>
                  <Textarea
                    id='notes'
                    placeholder='Any notes...'
                    rows={3}
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Check In Immediately */}
            <Controller
              name='checkInImmediately'
              control={form.control}
              render={({ field, fieldState }): JSX.Element => (
                <Field
                  orientation='horizontal'
                  data-invalid={fieldState.invalid}
                  className='flex items-center justify-end'
                >
                  <FieldLabel htmlFor='checkInImmediately' className='text-sm'>
                    Check in
                  </FieldLabel>
                  <Checkbox
                    id='checkInImmediately'
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

            {/* Error Message */}
            {error && <div className='text-red-600 text-sm'>{error}</div>}

            {/* Submit Button */}
            <div className='flex justify-end space-x-2'>
              <Button
                type='button'
                variant='outline'
                onClick={(): void => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={submitting}
              >
                {submitting ? (
                  <Loading
                    size='sm'
                    className='mr-2'
                  />
                ) : (
                  <UserPlus className='h-4 w-4 mr-2' />
                )}
                Add
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  )
}
