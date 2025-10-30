'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'
import { Phone, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Game = Database['public']['Tables']['games']['Row']
type Room = Database['public']['Tables']['rooms']['Row']

const waitlistJoinSchema = z.object({
  selectedGames: z.array(z.string()).min(1, 'Please select at least one game'),
  notes: z.string().optional(),
})

type WaitlistJoinData = z.infer<typeof waitlistJoinSchema>

interface WaitlistJoinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  games: Game[]
  room: Room
  onJoined: () => void
}

export function WaitlistJoinDialog({
  open,
  onOpenChange,
  games,
  room,
  onJoined,
}: WaitlistJoinDialogProps): JSX.Element {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<WaitlistJoinData>({
    resolver: zodResolver(waitlistJoinSchema),
    defaultValues: {
      selectedGames: [],
      notes: '',
    },
  })

  const onSubmit = async (data: WaitlistJoinData): Promise<void> => {
    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()

      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error('Please log in to join the waitlist')
      }

      // Get player record
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (playerError || !player) {
        throw new Error('Player profile not found')
      }

      // Create separate waitlist entries for each game
      const entries = data.selectedGames.map((gameId) => ({
        player_id: player.id,
        game_id: gameId,
        room_id: room.id,
        status: 'calledin' as const,
        notes: data.notes || null,
        entry_method: 'callin' as const,
      }))

      const { error: insertError } = await supabase
        .from('waitlist_entries')
        .insert(entries)

      if (insertError) {
        throw new Error('Failed to join waitlist. Please try again.')
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
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Phone className='h-5 w-5' />
            Join Waitlist
          </DialogTitle>
          <DialogDescription>
            Select the games you&apos;d like to join the waitlist for.
            You&apos;ll be notified when a seat becomes available.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-6'
          >
            <FormField
              control={form.control}
              name='selectedGames'
              render={(): JSX.Element => (
                <FormItem>
                  <FormLabel>Select Games</FormLabel>
                  <FormControl>
                    <div className='space-y-3'>
                      {availableGames.map((game) => (
                        <div
                          key={game.id}
                          className='flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50'
                        >
                          <Checkbox
                            id={game.id}
                            checked={form
                              .watch('selectedGames')
                              .includes(game.id)}
                            onCheckedChange={(checked): void => {
                              const current = form.getValues('selectedGames')
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
                            <div className='flex items-center gap-2 mt-1'>
                              <Badge
                                variant='outline'
                                className='text-xs'
                              >
                                {game.game_type.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <Badge
                                variant='secondary'
                                className='text-xs'
                              >
                                ${game.small_blind}/${game.big_blind}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='notes'
              render={({ field }): JSX.Element => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Any special requests or notes...'
                      className='resize-none'
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className='p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md'>
                {error}
              </div>
            )}

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
                  <CheckCircle className='h-4 w-4 mr-2' />
                )}
                Join Waitlist
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
