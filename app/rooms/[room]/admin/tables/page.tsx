'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOperator } from '@/lib/auth/user-context'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loading } from '@/components/ui/loading'
import { ArrowLeft, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table'
import { TableDialog } from '@/components/admin/table-dialog'

interface Table {
  id: string
  name: string
  seat_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

const columnHelper = createColumnHelper<Table>()

export default function TablesPage(): JSX.Element {
  const [loading, setLoading] = useState(true)
  const [tables, setTables] = useState<Table[]>([])
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const operator = useOperator()
  const router = useRouter()

  useEffect(() => {
    const fetchTables = async (): Promise<void> => {
      if (!operator?.profile?.room_id) return

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('tables')
          .select('*')
          .eq('room_id', operator.profile.room_id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching tables:', error)
          return
        }

        setTables(data || [])
      } catch (error) {
        console.error('Error fetching tables:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTables()
  }, [operator])

  const handleToggleActive = async (
    tableId: string,
    isActive: boolean
  ): Promise<void> => {
    setUpdating(tableId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tables')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tableId)

      if (error) {
        console.error('Error updating table:', error)
        return
      }

      setTables((prev) =>
        prev.map((table) =>
          table.id === tableId ? { ...table, is_active: isActive } : table
        )
      )
    } catch (error) {
      console.error('Error updating table:', error)
    } finally {
      setUpdating(null)
    }
  }

  const handleRowClick = (table: Table): void => {
    setSelectedTable(table)
    setDialogOpen(true)
  }

  const handleAddTable = (): void => {
    setSelectedTable(null)
    setDialogOpen(true)
  }

  const handleDialogClose = (): void => {
    setDialogOpen(false)
    setSelectedTable(null)
  }

  const handleTableSaved = (savedTable: Table): void => {
    if (selectedTable) {
      // Update existing table
      setTables((prev) =>
        prev.map((table) => (table.id === savedTable.id ? savedTable : table))
      )
    } else {
      // Add new table
      setTables((prev) => [savedTable, ...prev])
    }
    handleDialogClose()
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Table Name',
        cell: (info) => <div className='font-medium'>{info.getValue()}</div>,
      }),
      columnHelper.accessor('seat_count', {
        header: 'Seat Count',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('is_active', {
        header: 'Active',
        cell: (info) => {
          const table = info.row.original
          return (
            <Switch
              checked={info.getValue()}
              onCheckedChange={(checked) =>
                handleToggleActive(table.id, checked)
              }
              disabled={updating === table.id}
            />
          )
        },
      }),
    ],
    [updating]
  )

  const table = useReactTable({
    data: tables,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

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
      {/* Header with back button */}
      <div className='flex items-center gap-4'>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8'
          onClick={() => router.back()}
        >
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <h1 className='text-3xl font-bold tracking-tight'>Tables</h1>
      </div>

      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>Table Management</CardTitle>
            <Button onClick={handleAddTable}>
              <Plus className='h-4 w-4 mr-2' />
              Add Table
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='rounded-md border'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='sticky top-0 bg-background border-b'>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className='border-b transition-colors hover:bg-muted/50 cursor-pointer'
                        onClick={() => handleRowClick(row.original)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className='p-4 align-middle'
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className='h-24 text-center text-muted-foreground'
                      >
                        No tables found. Create your first table to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <TableDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        table={selectedTable}
        onTableSaved={handleTableSaved}
        roomId={operator?.profile?.room_id || ''}
      />
    </div>
  )
}
