'use client'

import { useState, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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
          <DialogDescription>
            {isEditing
              ? 'Update game settings and configuration.'
              : 'Create a new poker game with custom settings.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-6'
        >
          <FieldGroup>
            <div className='grid gap-4 md:grid-cols-2'>
              <Controller
                name='name'
                control={form.control}
                render={({ field, fieldState }): JSX.Element => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor='name'>Game Name *</FieldLabel>
                    <Input
                      id='name'
                      placeholder='Enter game name'
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
                name='game_type'
                control={form.control}
                render={({ field, fieldState }): JSX.Element => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor='game_type'>Game Type *</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger aria-invalid={fieldState.invalid}>
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
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name='small_blind'
                control={form.control}
                render={({ field, fieldState }): JSX.Element => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor='small_blind'>Small Blind *</FieldLabel>
                    <Input
                      id='small_blind'
                      type='number'
                      step='0.01'
                      placeholder='0.00'
                      aria-invalid={fieldState.invalid}
                      {...field}
                      onChange={(e): void => {
                        field.onChange(Number(e.target.value))
                      }}
                      value={field.value}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name='big_blind'
                control={form.control}
                render={({ field, fieldState }): JSX.Element => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor='big_blind'>Big Blind *</FieldLabel>
                    <Input
                      id='big_blind'
                      type='number'
                      step='0.01'
                      placeholder='0.00'
                      aria-invalid={fieldState.invalid}
                      {...field}
                      onChange={(e): void => {
                        field.onChange(Number(e.target.value))
                      }}
                      value={field.value}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name='min_buy_in'
                control={form.control}
                render={({ field, fieldState }): JSX.Element => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor='min_buy_in'>Min Buy-in *</FieldLabel>
                    <Input
                      id='min_buy_in'
                      type='number'
                      step='0.01'
                      placeholder='0.00'
                      aria-invalid={fieldState.invalid}
                      {...field}
                      onChange={(e): void => {
                        field.onChange(Number(e.target.value))
                      }}
                      value={field.value}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name='max_buy_in'
                control={form.control}
                render={({ field, fieldState }): JSX.Element => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor='max_buy_in'>Max Buy-in *</FieldLabel>
                    <Input
                      id='max_buy_in'
                      type='number'
                      step='0.01'
                      placeholder='0.00'
                      aria-invalid={fieldState.invalid}
                      {...field}
                      onChange={(e): void => {
                        field.onChange(Number(e.target.value))
                      }}
                      value={field.value}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name='max_players'
                control={form.control}
                render={({ field, fieldState }): JSX.Element => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor='max_players'>Max Players *</FieldLabel>
                    <Input
                      id='max_players'
                      type='number'
                      min='2'
                      max='10'
                      placeholder='9'
                      aria-invalid={fieldState.invalid}
                      {...field}
                      onChange={(e): void => {
                        field.onChange(Number(e.target.value))
                      }}
                      value={field.value}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name='rake'
                control={form.control}
                render={({ field, fieldState }): JSX.Element => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor='rake'>Rake</FieldLabel>
                    <Input
                      id='rake'
                      placeholder='e.g., 5% or $5 max'
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

            <Controller
              name='is_active'
              control={form.control}
              render={({ field, fieldState }): JSX.Element => (
                <Field
                  orientation='horizontal'
                  data-invalid={fieldState.invalid}
                  className='flex items-center space-x-2'
                >
                  <Switch
                    id='is_active'
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldLabel htmlFor='is_active'>Game is active</FieldLabel>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

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
