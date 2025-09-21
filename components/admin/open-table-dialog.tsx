'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const openTableSchema = z.object({
  table_id: z.string().min(1, 'Table is required'),
  game_id: z.string().min(1, 'Game is required'),
})

type OpenTableFormData = z.infer<typeof openTableSchema>

interface Table {
  id: string
  name: string
  seat_count: number
  is_active: boolean
}

interface Game {
  id: string
  name: string
  game_type: string
  small_blind: number
  big_blind: number
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

interface TableSession {
  id: string
  table_id: string
  game_id: string
  room_id: string
  start_time: string
  end_time: string | null
  table: Table
  game: {
    id: string
    name: string
    game_type: string
  }
}

interface OpenTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTableOpened: (tableSession: TableSession) => void
  roomId: string
}

export function OpenTableDialog({
  open,
  onOpenChange,
  onTableOpened,
  roomId,
}: OpenTableDialogProps): JSX.Element {
  const [saving, setSaving] = useState(false)
  const [tables, setTables] = useState<Table[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)

  const form = useForm<OpenTableFormData>({
    resolver: zodResolver(openTableSchema),
    defaultValues: {
      table_id: '',
      game_id: '',
    },
  })

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Fetch available tables
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_active', true)
        .order('name')

      if (tablesError) {
        console.error('Error fetching tables:', tablesError)
      }

      // Fetch active games
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_active', true)
        .order('name')

      if (gamesError) {
        console.error('Error fetching games:', gamesError)
      }

      setTables(tablesData || [])
      setGames(gamesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    if (open && roomId) {
      fetchData()
    }
  }, [open, roomId, fetchData])

  const onSubmit = async (data: OpenTableFormData): Promise<void> => {
    if (!roomId) return

    setSaving(true)
    try {
      const supabase = createClient()

      const tableSessionData = {
        table_id: data.table_id,
        game_id: data.game_id,
        room_id: roomId,
        start_time: new Date().toISOString(),
      }

      const { data: newTableSession, error } = await supabase
        .from('table_sessions')
        .insert(tableSessionData)
        .select(
          `
          *,
          table:tables(id, name, seat_count, is_active),
          game:games(id, name, game_type)
        `
        )
        .single()

      if (error) {
        console.error('Error creating table session:', error)
        return
      }

      onTableOpened(newTableSession)
      form.reset()
    } catch (error) {
      console.error('Error creating table session:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = (): void => {
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
    >
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Open New Table</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-6'
        >
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='table_id'>Table *</Label>
              <Select
                value={form.watch('table_id')}
                onValueChange={(value) => form.setValue('table_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select a table' />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem
                      key={table.id}
                      value={table.id}
                    >
                      {table.name} ({table.seat_count} seats)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.table_id && (
                <p className='text-sm text-destructive'>
                  {form.formState.errors.table_id.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='game_id'>Game *</Label>
              <Select
                value={form.watch('game_id')}
                onValueChange={(value) => form.setValue('game_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select a game' />
                </SelectTrigger>
                <SelectContent>
                  {games.map((game) => (
                    <SelectItem
                      key={game.id}
                      value={game.id}
                    >
                      {game.name} (${game.small_blind}/${game.big_blind})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.game_id && (
                <p className='text-sm text-destructive'>
                  {form.formState.errors.game_id.message}
                </p>
              )}
            </div>
          </div>

          {loading && (
            <div className='text-center py-4 text-muted-foreground'>
              Loading tables and games...
            </div>
          )}

          <div className='flex gap-4 pt-4 justify-end'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={saving || loading}
            >
              {saving ? 'Opening...' : 'Open Table'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
