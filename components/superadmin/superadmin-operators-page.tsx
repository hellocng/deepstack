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
import { CreateOperatorDialog } from '@/components/dialogs/create-operator-dialog'

type Operator = Tables<'operators'> & {
  rooms: Tables<'rooms'> | null
}

export function SuperAdminOperatorsPage(): JSX.Element {
  const [operators, setOperators] = useState<Operator[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    const fetchOperators = async (): Promise<void> => {
      try {
        const supabase = createClient()

        // Fetch operators with room information
        const { data: operatorsData, error } = await supabase
          .from('operators')
          .select(
            `
            *,
            rooms!inner(*)
          `
          )
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching operators:', error)
          return
        }

        setOperators(operatorsData || [])
      } catch (error) {
        console.error('Error fetching operators:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOperators()
  }, [])

  const handleOperatorCreated = (): void => {
    // Refresh the operators list
    setShowCreateDialog(false)
    // You could add a refresh function here
    window.location.reload() // Simple refresh for now
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-muted-foreground'>Loading operators...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Operators</h1>
          <p className='text-muted-foreground'>
            Manage operator accounts and their room assignments
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          Create Operator
        </Button>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {operators.map((operator) => (
          <Card key={operator.id}>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-lg'>
                  {operator.first_name} {operator.last_name}
                </CardTitle>
                <Badge variant={operator.is_active ? 'default' : 'secondary'}>
                  {operator.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <CardDescription>{operator.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Role:</span>
                  <Badge variant='outline'>{operator.role}</Badge>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Room:</span>
                  <span>{operator.rooms?.name || 'No room assigned'}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Phone:</span>
                  <span>{operator.phone_number || 'Not provided'}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Last Login:</span>
                  <span>
                    {operator.last_login
                      ? new Date(operator.last_login).toLocaleDateString()
                      : 'Never'}
                  </span>
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
                  {operator.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {operators.length === 0 && (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <h3 className='text-lg font-medium mb-2'>No operators found</h3>
            <p className='text-muted-foreground text-center mb-4'>
              Create your first operator account to get started.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              Create Operator
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateOperatorDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onOperatorCreated={handleOperatorCreated}
      />
    </div>
  )
}
