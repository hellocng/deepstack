'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Filter, X } from 'lucide-react'

interface GameFiltersProps {
  selectedType?: string
  selectedStakes?: string
  onTypeChange?: (type: string) => void
  onStakesChange?: (stakes: string) => void
  onClearFilters?: () => void
}

export function GameFilters({
  selectedType,
  selectedStakes,
  onTypeChange,
  onStakesChange,
  onClearFilters,
}: GameFiltersProps) {
  const gameTypes = [
    { value: 'texas_holdem', label: "Texas Hold'em" },
    { value: 'omaha', label: 'Omaha' },
    { value: 'seven_card_stud', label: '7-Card Stud' },
    { value: 'five_card_draw', label: '5-Card Draw' },
    { value: 'razz', label: 'Razz' },
    { value: 'stud_hi_lo', label: 'Stud Hi/Lo' },
  ]

  const stakesRanges = [
    { value: 'micro', label: 'Micro ($0.50/$1 - $1/$2)' },
    { value: 'low', label: 'Low ($2/$5 - $5/$10)' },
    { value: 'mid', label: 'Mid ($10/$25 - $25/$50)' },
    { value: 'high', label: 'High ($50/$100+)' },
  ]

  const hasActiveFilters = selectedType || selectedStakes

  return (
    <div className='space-y-4'>
      {/* Filter Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-2'>
          <Filter className='h-4 w-4' />
          <span className='text-sm font-medium'>Filters</span>
          {hasActiveFilters && (
            <Button
              variant='ghost'
              size='sm'
              onClick={onClearFilters}
              className='h-6 px-2 text-xs'
            >
              <X className='h-3 w-3 mr-1' />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Game Type Filters */}
      <div>
        <h4 className='text-sm font-medium mb-2'>Game Type</h4>
        <div className='flex flex-wrap gap-2'>
          {gameTypes.map((type) => (
            <Button
              key={type.value}
              variant={selectedType === type.value ? 'default' : 'outline'}
              size='sm'
              onClick={() => onTypeChange?.(type.value)}
              className='text-xs'
            >
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stakes Filters */}
      <div>
        <h4 className='text-sm font-medium mb-2'>Stakes</h4>
        <div className='flex flex-wrap gap-2'>
          {stakesRanges.map((stakes) => (
            <Button
              key={stakes.value}
              variant={selectedStakes === stakes.value ? 'default' : 'outline'}
              size='sm'
              onClick={() => onStakesChange?.(stakes.value)}
              className='text-xs'
            >
              {stakes.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className='flex flex-wrap gap-2'>
          {selectedType && (
            <Badge
              variant='secondary'
              className='text-xs'
            >
              {gameTypes.find((t) => t.value === selectedType)?.label}
              <button
                onClick={() => onTypeChange?.('')}
                className='ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5'
              >
                <X className='h-3 w-3' />
              </button>
            </Badge>
          )}
          {selectedStakes && (
            <Badge
              variant='secondary'
              className='text-xs'
            >
              {stakesRanges.find((s) => s.value === selectedStakes)?.label}
              <button
                onClick={() => onStakesChange?.('')}
                className='ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5'
              >
                <X className='h-3 w-3' />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
