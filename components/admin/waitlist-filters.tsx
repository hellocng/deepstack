'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Filter, RefreshCw, Search, X } from 'lucide-react'
import type { Database } from '@/types/database'

type WaitlistEntry = Database['public']['Tables']['waitlist_entries']['Row'] & {
  player: {
    id: string
    alias: string | null
    avatar_url: string | null
  } | null
  game: {
    id: string
    name: string
    game_type: string
    small_blind: number
    big_blind: number
  } | null
}

interface WaitlistFiltersProps {
  entries: WaitlistEntry[]
  filterStatus: string
  filterGame: string
  searchQuery: string
  onStatusChange: (status: string) => void
  onGameChange: (gameId: string) => void
  onSearchChange: (query: string) => void
  onRefresh: () => void
}

export function WaitlistFilters({
  entries,
  filterStatus,
  filterGame,
  searchQuery,
  onStatusChange,
  onGameChange,
  onSearchChange,
  onRefresh,
}: WaitlistFiltersProps): JSX.Element {
  const [showFilters, setShowFilters] = useState(false)

  // Get unique games from entries
  const games = Array.from(
    new Map(
      entries
        .map((entry) => entry.game)
        .filter(Boolean)
        .map((game) => [game!.id, { id: game!.id, name: game!.name }])
    ).values()
  )

  const clearFilters = (): void => {
    onStatusChange('all')
    onGameChange('all')
    onSearchChange('')
  }

  const hasActiveFilters =
    filterStatus !== 'all' || filterGame !== 'all' || searchQuery !== ''

  return (
    <Card>
      <CardContent className='p-4'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-2'>
            <Filter className='h-4 w-4' />
            <span className='font-medium'>Filters</span>
            {hasActiveFilters && (
              <Button
                variant='ghost'
                size='sm'
                onClick={clearFilters}
                className='h-6 px-2 text-xs'
              >
                <X className='h-3 w-3 mr-1' />
                Clear
              </Button>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={(): void => setShowFilters(!showFilters)}
            >
              <Filter className='h-4 w-4 mr-2' />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={onRefresh}
            >
              <RefreshCw className='h-4 w-4 mr-2' />
              Refresh
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {/* Search */}
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Search Player</label>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search by player name...'
                  value={searchQuery}
                  onChange={(e): void => onSearchChange(e.target.value)}
                  className='pl-10'
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Status</label>
              <Select
                value={filterStatus}
                onValueChange={onStatusChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder='All statuses' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Statuses</SelectItem>
                  <SelectItem value='waiting'>Waiting</SelectItem>
                  <SelectItem value='calledin'>Called In</SelectItem>
                  <SelectItem value='notified'>Notified</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Game Filter */}
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Game</label>
              <Select
                value={filterGame}
                onValueChange={onGameChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder='All games' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Games</SelectItem>
                  {games.map((game) => (
                    <SelectItem
                      key={game.id}
                      value={game.id}
                    >
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className='mt-4 pt-4 border-t'>
          <div className='flex items-center justify-between text-sm text-muted-foreground'>
            <span>
              Showing {entries.length} of {entries.length} entries
            </span>
            {hasActiveFilters && (
              <span className='text-blue-600'>Filters applied</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
