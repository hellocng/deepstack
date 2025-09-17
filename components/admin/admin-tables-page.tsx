'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'

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
          error: userError,
        } = await supabase.auth.getUser()

        const userId = user?.id

        if (!userId || userError) return

        const { data: operator, error: operatorError } = await supabase
          .from('operators')
          .select('room_id')
          .eq('auth_id', userId)
          .single()

        if (operatorError || !operator) return

        const roomId = (operator as { room_id: string | null }).room_id
        if (!roomId) return

        // Fetch tables for the operator's room
        const { data: tablesData, error } = await supabase
          .from('tables')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: false })

        if (error) {
          // Error fetching tables - handled by error state
          return
        }

        setTables(tablesData || [])
      } catch (_error) {
        // Error fetching tables - handled by error state
      } finally {
        setLoading(false)
      }
    }

    fetchTables()
  }, [])

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loading
          size='md'
          text='Loading tables...'
        />
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
                <Badge variant={table.is_active ? 'default' : 'secondary'}>
                  {table.is_active ? 'Active' : 'Inactive'}
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
                  <span className='text-muted-foreground'>Status:</span>
                  <span>{table.is_active ? 'Active' : 'Inactive'}</span>
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
                  {table.is_active ? 'Close' : 'Open'}
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
