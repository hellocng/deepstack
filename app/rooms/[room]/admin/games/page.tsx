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
import { GameDialog } from '@/components/admin/game-dialog'

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

const columnHelper = createColumnHelper<Game>()

export default function GamesPage(): JSX.Element {
  const [loading, setLoading] = useState(true)
  const [games, setGames] = useState<Game[]>([])
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const operator = useOperator()
  const router = useRouter()

  useEffect(() => {
    const fetchGames = async (): Promise<void> => {
      if (!operator?.profile?.room_id) return

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('room_id', operator.profile.room_id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching games:', error)
          return
        }

        setGames(data || [])
      } catch (error) {
        console.error('Error fetching games:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGames()
  }, [operator])

  const handleToggleActive = async (
    gameId: string,
    isActive: boolean
  ): Promise<void> => {
    setUpdating(gameId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('games')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId)

      if (error) {
        console.error('Error updating game:', error)
        return
      }

      setGames((prev) =>
        prev.map((game) =>
          game.id === gameId ? { ...game, is_active: isActive } : game
        )
      )
    } catch (error) {
      console.error('Error updating game:', error)
    } finally {
      setUpdating(null)
    }
  }

  const handleRowClick = (game: Game): void => {
    setSelectedGame(game)
    setDialogOpen(true)
  }

  const handleAddGame = (): void => {
    setSelectedGame(null)
    setDialogOpen(true)
  }

  const handleDialogClose = (): void => {
    setDialogOpen(false)
    setSelectedGame(null)
  }

  const handleGameSaved = (savedGame: Game): void => {
    if (selectedGame) {
      // Update existing game
      setGames((prev) =>
        prev.map((game) => (game.id === savedGame.id ? savedGame : game))
      )
    } else {
      // Add new game
      setGames((prev) => [savedGame, ...prev])
    }
    handleDialogClose()
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Game Name',
        cell: (info) => <div className='font-medium'>{info.getValue()}</div>,
      }),
      columnHelper.accessor('game_type', {
        header: 'Type',
        cell: (info) => (
          <div className='capitalize'>{info.getValue().replace('_', ' ')}</div>
        ),
      }),
      columnHelper.accessor('small_blind', {
        header: 'Small Blind',
        cell: (info) => `$${info.getValue()}`,
      }),
      columnHelper.accessor('big_blind', {
        header: 'Big Blind',
        cell: (info) => `$${info.getValue()}`,
      }),
      columnHelper.accessor('min_buy_in', {
        header: 'Min Buy-in',
        cell: (info) => `$${info.getValue()}`,
      }),
      columnHelper.accessor('max_buy_in', {
        header: 'Max Buy-in',
        cell: (info) => `$${info.getValue()}`,
      }),
      columnHelper.accessor('max_players', {
        header: 'Max Players',
        cell: (info) => info.getValue() || '-',
      }),
      columnHelper.accessor('rake', {
        header: 'Rake',
        cell: (info) => info.getValue() || '-',
      }),
      columnHelper.accessor('is_active', {
        header: 'Active',
        cell: (info) => {
          const game = info.row.original
          return (
            <Switch
              checked={info.getValue() || false}
              onCheckedChange={(checked) =>
                handleToggleActive(game.id, checked)
              }
              disabled={updating === game.id}
            />
          )
        },
      }),
    ],
    [updating]
  )

  const table = useReactTable({
    data: games,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loading
          size='md'
          text='Loading games...'
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
        <h1 className='text-3xl font-bold tracking-tight'>Games</h1>
      </div>

      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>Game Management</CardTitle>
            <Button onClick={handleAddGame}>
              <Plus className='h-4 w-4 mr-2' />
              Add Game
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
                        No games found. Create your first game to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <GameDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        game={selectedGame}
        onGameSaved={handleGameSaved}
        roomId={operator?.profile?.room_id || ''}
      />
    </div>
  )
}
