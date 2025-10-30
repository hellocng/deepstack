'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-8'
          >
            {/* Player Info */}
            <div className='grid gap-4 md:grid-cols-2'>
              <FormField
                control={form.control}
                name='alias'
                render={({ field }): JSX.Element => (
                  <FormItem>
                    <FormLabel>Alias</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Enter player alias'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='phone'
                render={({ field }): JSX.Element => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        type='tel'
                        placeholder='Enter phone number'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Game Selection */}
            <FormField
              control={form.control}
              name='selectedGames'
              render={({ field }): JSX.Element => (
                <FormItem>
                  <FormLabel>Select Games</FormLabel>
                  <FormControl>
                    <div className='grid gap-4 md:grid-cols-2'>
                      {availableGames.map((game) => (
                        <div
                          key={game.id}
                          className='flex items-center space-x-2'
                        >
                          <Checkbox
                            id={game.id}
                            checked={field.value.includes(game.id)}
                            onCheckedChange={(checked) => {
                              const current = field.value
                              if (checked) {
                                form.setValue('selectedGames', [
                                  ...current,
                                  game.id,
                                ])
                              } else {
                                form.setValue(
                                  'selectedGames',
                                  current.filter((id) => id !== game.id)
                                )
                              }
                            }}
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name='notes'
              render={({ field }): JSX.Element => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Any notes...'
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Check In Immediately */}
            <FormField
              control={form.control}
              name='checkInImmediately'
              render={({ field }): JSX.Element => (
                <FormItem className='flex flex-row items-center justify-end space-x-3 space-y-0'>
                  <div className='space-y-1 leading-none'>
                    <FormLabel className='text-sm'>Check in</FormLabel>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

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
        </Form>
      </DialogContent>
    </Dialog>
  )
}
