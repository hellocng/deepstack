'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const gameFormSchema = z.object({
  name: z.string().min(1, 'Game name is required'),
  game_type: z.string().min(1, 'Game type is required'),
  small_blind: z.number().min(0, 'Small blind must be positive'),
  big_blind: z.number().min(0, 'Big blind must be positive'),
  min_buy_in: z.number().min(0, 'Min buy-in must be positive'),
  max_buy_in: z.number().min(0, 'Max buy-in must be positive'),
  max_players: z
    .number()
    .min(2, 'Max players must be at least 2')
    .max(10, 'Max players cannot exceed 10'),
  rake: z.string().optional(),
  is_active: z.boolean(),
})

type GameFormData = z.infer<typeof gameFormSchema>

interface Game {
  id: string
  name: string
  game_type: string
  small_blind: number
  big_blind: number
  min_buy_in: number
  max_buy_in: number
  rake: string | null
  max_players: number | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

interface GameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  game: Game | null
  onGameSaved: (game: Game) => void
  roomId: string
}

const gameTypes = [
  { value: 'texas_holdem', label: "Texas Hold'em" },
  { value: 'omaha', label: 'Omaha' },
  { value: 'seven_card_stud', label: 'Seven Card Stud' },
  { value: 'five_card_draw', label: 'Five Card Draw' },
  { value: 'razr', label: 'Razr' },
  { value: 'stud_hi_lo', label: 'Stud Hi/Lo' },
]

export function GameDialog({
  open,
  onOpenChange,
  game,
  onGameSaved,
  roomId,
}: GameDialogProps): JSX.Element {
  const [saving, setSaving] = useState(false)
  const isEditing = !!game

  const form = useForm<GameFormData>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: {
      name: '',
      game_type: '',
      small_blind: 0,
      big_blind: 0,
      min_buy_in: 0,
      max_buy_in: 0,
      max_players: 9,
      rake: '',
      is_active: true,
    },
  })

  useEffect(() => {
    if (game) {
      form.reset({
        name: game.name,
        game_type: game.game_type,
        small_blind: game.small_blind,
        big_blind: game.big_blind,
        min_buy_in: game.min_buy_in,
        max_buy_in: game.max_buy_in,
        max_players: game.max_players || 9,
        rake: game.rake || '',
        is_active: game.is_active || false,
      })
    } else {
      form.reset({
        name: '',
        game_type: '',
        small_blind: 0,
        big_blind: 0,
        min_buy_in: 0,
        max_buy_in: 0,
        max_players: 9,
        rake: '',
        is_active: true,
      })
    }
  }, [game, form])

  const onSubmit = async (data: GameFormData): Promise<void> => {
    if (!roomId) return

    setSaving(true)
    try {
      const supabase = createClient()

      const gameData = {
        name: data.name,
        game_type: data.game_type as
          | 'texas_holdem'
          | 'omaha'
          | 'seven_card_stud'
          | 'five_card_draw'
          | 'razr'
          | 'stud_hi_lo',
        small_blind: data.small_blind,
        big_blind: data.big_blind,
        min_buy_in: data.min_buy_in,
        max_buy_in: data.max_buy_in,
        max_players: data.max_players,
        rake: data.rake || null,
        is_active: data.is_active,
        room_id: roomId,
        updated_at: new Date().toISOString(),
      }

      let result
      if (isEditing && game) {
        // Update existing game
        const { data: updatedGame, error } = await supabase
          .from('games')
          .update(gameData)
          .eq('id', game.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating game:', error)
          return
        }
        result = updatedGame
      } else {
        // Create new game
        const { data: newGame, error } = await supabase
          .from('games')
          .insert(gameData)
          .select()
          .single()

        if (error) {
          console.error('Error creating game:', error)
          return
        }
        result = newGame
      }

      onGameSaved(result)
    } catch (error) {
      console.error('Error saving game:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Game' : 'Add New Game'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-6'
        >
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='name'>Game Name *</Label>
              <Input
                id='name'
                {...form.register('name')}
                placeholder='Enter game name'
              />
              {form.formState.errors.name && (
                <p className='text-sm text-destructive'>
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='game_type'>Game Type *</Label>
              <Select
                value={form.watch('game_type')}
                onValueChange={(value) => form.setValue('game_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select game type' />
                </SelectTrigger>
                <SelectContent>
                  {gameTypes.map((type) => (
                    <SelectItem
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.game_type && (
                <p className='text-sm text-destructive'>
                  {form.formState.errors.game_type.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='small_blind'>Small Blind *</Label>
              <Input
                id='small_blind'
                type='number'
                step='0.01'
                {...form.register('small_blind', { valueAsNumber: true })}
                placeholder='0.00'
              />
              {form.formState.errors.small_blind && (
                <p className='text-sm text-destructive'>
                  {form.formState.errors.small_blind.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='big_blind'>Big Blind *</Label>
              <Input
                id='big_blind'
                type='number'
                step='0.01'
                {...form.register('big_blind', { valueAsNumber: true })}
                placeholder='0.00'
              />
              {form.formState.errors.big_blind && (
                <p className='text-sm text-destructive'>
                  {form.formState.errors.big_blind.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='min_buy_in'>Min Buy-in *</Label>
              <Input
                id='min_buy_in'
                type='number'
                step='0.01'
                {...form.register('min_buy_in', { valueAsNumber: true })}
                placeholder='0.00'
              />
              {form.formState.errors.min_buy_in && (
                <p className='text-sm text-destructive'>
                  {form.formState.errors.min_buy_in.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='max_buy_in'>Max Buy-in *</Label>
              <Input
                id='max_buy_in'
                type='number'
                step='0.01'
                {...form.register('max_buy_in', { valueAsNumber: true })}
                placeholder='0.00'
              />
              {form.formState.errors.max_buy_in && (
                <p className='text-sm text-destructive'>
                  {form.formState.errors.max_buy_in.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='max_players'>Max Players *</Label>
              <Input
                id='max_players'
                type='number'
                min='2'
                max='10'
                {...form.register('max_players', { valueAsNumber: true })}
                placeholder='9'
              />
              {form.formState.errors.max_players && (
                <p className='text-sm text-destructive'>
                  {form.formState.errors.max_players.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='rake'>Rake</Label>
              <Input
                id='rake'
                {...form.register('rake')}
                placeholder='e.g., 5% or $5 max'
              />
              {form.formState.errors.rake && (
                <p className='text-sm text-destructive'>
                  {form.formState.errors.rake.message}
                </p>
              )}
            </div>
          </div>

          <div className='flex items-center space-x-2'>
            <Switch
              id='is_active'
              checked={form.watch('is_active')}
              onCheckedChange={(checked) => form.setValue('is_active', checked)}
            />
            <Label htmlFor='is_active'>Game is active</Label>
          </div>

          <div className='flex gap-4 pt-4 justify-end'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={saving}
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Game'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
