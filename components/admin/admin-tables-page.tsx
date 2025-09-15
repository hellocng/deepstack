'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/types/supabase'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Table = Tables<'tables'>

export function AdminTablesPage(): JSX.Element {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTables = async (): Promise<void> => {
      try {
        const supabase = createClient()

        // Get current operator's room_id
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (!user || authError) return

        const { data: operator } = await supabase
          .from('operators')
          .select('room_id')
          .eq('auth_id', user.id)
          .single()

        if (!operator) return

        // Fetch tables for the operator's room
        const { data: tablesData, error } = await supabase
          .from('tables')
          .select('*')
          .eq('room_id', operator.room_id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching tables:', error)
          return
        }

        setTables(tablesData || [])
      } catch (error) {
        console.error('Error fetching tables:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTables()
  }, [])

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-muted-foreground'>Loading tables...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Tables</h1>
          <p className='text-muted-foreground'>
            Manage poker tables in your room
          </p>
        </div>
        <Button>Create Table</Button>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {tables.map((table) => (
          <Card key={table.id}>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-lg'>{table.name}</CardTitle>
                <Badge
                  variant={table.status === 'open' ? 'default' : 'secondary'}
                >
                  {table.status}
                </Badge>
              </div>
              <CardDescription>Table #{table.id.slice(-4)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Seat Count:</span>
                  <span>{table.seat_count}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Game:</span>
                  <span>{table.game_id ? 'Assigned' : 'Unassigned'}</span>
                </div>
              </div>
              <div className='flex gap-2 mt-4'>
                <Button
                  variant='outline'
                  size='sm'
                >
                  Edit
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                >
                  {table.status === 'open' ? 'Close' : 'Open'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tables.length === 0 && (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <h3 className='text-lg font-medium mb-2'>No tables found</h3>
            <p className='text-muted-foreground text-center mb-4'>
              Create your first poker table to get started.
            </p>
            <Button>Create Table</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
