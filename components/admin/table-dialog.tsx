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

const tableFormSchema = z.object({
  name: z.string().min(1, 'Table name is required'),
  seat_count: z
    .number()
    .min(2, 'Seat count must be at least 2')
    .max(10, 'Seat count cannot exceed 10'),
  is_active: z.boolean(),
})

type TableFormData = z.infer<typeof tableFormSchema>

interface Table {
  id: string
  name: string
  seat_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface TableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table | null
  onTableSaved: (table: Table) => void
  roomId: string
}

export function TableDialog({
  open,
  onOpenChange,
  table,
  onTableSaved,
  roomId,
}: TableDialogProps): JSX.Element {
  const [saving, setSaving] = useState(false)
  const isEditing = !!table

  const form = useForm<TableFormData>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      name: '',
      seat_count: 9,
      is_active: true,
    },
  })

  useEffect(() => {
    if (table) {
      form.reset({
        name: table.name,
        seat_count: table.seat_count,
        is_active: table.is_active,
      })
    } else {
      form.reset({
        name: '',
        seat_count: 9,
        is_active: true,
      })
    }
  }, [table, form])

  const onSubmit = async (data: TableFormData): Promise<void> => {
    if (!roomId) return

    setSaving(true)
    try {
      const supabase = createClient()

      const tableData = {
        name: data.name,
        seat_count: data.seat_count,
        is_active: data.is_active,
        room_id: roomId,
        updated_at: new Date().toISOString(),
      }

      let result
      if (isEditing && table) {
        // Update existing table
        const { data: updatedTable, error } = await supabase
          .from('tables')
          .update(tableData)
          .eq('id', table.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating table:', error)
          return
        }
        result = updatedTable
      } else {
        // Create new table
        const { data: newTable, error } = await supabase
          .from('tables')
          .insert(tableData)
          .select()
          .single()

        if (error) {
          console.error('Error creating table:', error)
          return
        }
        result = newTable
      }

      onTableSaved(result)
    } catch (error) {
      console.error('Error saving table:', error)
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
          <DialogTitle>
            {isEditing ? 'Edit Table' : 'Add New Table'}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-6'
        >
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='name'>Table Name *</Label>
              <Input
                id='name'
                {...form.register('name')}
                placeholder='Enter table name'
              />
              {form.formState.errors.name && (
                <p className='text-sm text-destructive'>
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='seat_count'>Seat Count *</Label>
              <Input
                id='seat_count'
                type='number'
                min='2'
                max='10'
                {...form.register('seat_count', { valueAsNumber: true })}
                placeholder='9'
              />
              {form.formState.errors.seat_count && (
                <p className='text-sm text-destructive'>
                  {form.formState.errors.seat_count.message}
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
            <Label htmlFor='is_active'>Table is active</Label>
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
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Table'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
