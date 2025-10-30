'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  GripVertical,
  ArrowUp,
  ArrowDown,
  MoveUp,
  MoveDown,
  MoreHorizontal,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { WaitlistReorderButtons } from './waitlist-reorder-buttons'
import { getStatusConfig } from '@/lib/waitlist-status-utils'
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

interface WaitlistDragDropProps {
  entry: WaitlistEntry
  position: number
  totalEntries: number
  onReorder: () => void
  onEntryClick?: (entry: WaitlistEntry) => void
  className?: string
}

export function WaitlistDragDrop({
  entry,
  position,
  totalEntries,
  onReorder,
  onEntryClick,
  className = '',
}: WaitlistDragDropProps): JSX.Element {
  const [isReordering, setIsReordering] = useState(false)

  const statusConfig = getStatusConfig(entry.status)

  const handleOptimisticReorder = (_entryId: string, _action: string): void => {
    setIsReordering(true)
    // Optimistic update - the real-time hook will handle the actual update
    setTimeout(() => {
      setIsReordering(false)
      onReorder()
    }, 500)
  }

  const canMoveUp = position > 1
  const canMoveDown = position < totalEntries

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md ${
        isReordering ? 'opacity-50' : ''
      } ${className}`}
    >
      <CardContent className='p-4'>
        <div className='flex items-center gap-4'>
          {/* Drag Handle */}
          <div className='flex flex-col items-center gap-1'>
            <GripVertical className='h-4 w-4 text-muted-foreground' />
            <span className='text-xs font-medium text-muted-foreground'>
              #{position}
            </span>
          </div>

          {/* Player Info */}
          <div
            className='flex-1 min-w-0 cursor-pointer'
            onClick={(): void => onEntryClick?.(entry)}
          >
            <div className='flex items-center gap-2 mb-1'>
              <h3 className='font-medium truncate'>
                {entry.player?.alias || 'Unknown Player'}
              </h3>
              <Badge
                variant={
                  statusConfig.variant as
                    | 'default'
                    | 'secondary'
                    | 'destructive'
                    | 'outline'
                }
              >
                {statusConfig.label}
              </Badge>
            </div>

            <div className='flex items-center gap-4 text-sm text-muted-foreground'>
              <span>{entry.game?.name || 'Unknown Game'}</span>
              <span>
                {entry.game?.game_type?.replace('_', ' ').toUpperCase() ||
                  'Unknown'}
              </span>
              <span>
                ${entry.game?.small_blind}/${entry.game?.big_blind}
              </span>
            </div>

            {/* Note field not guaranteed in type; omit display to ensure type safety */}
          </div>

          {/* Reorder Controls */}
          <div className='flex items-center gap-1'>
            <WaitlistReorderButtons
              entryId={entry.id}
              onReorder={onReorder}
              onOptimisticReorder={handleOptimisticReorder}
              className='hidden sm:flex'
            />

            {/* Mobile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='sm:hidden'
                >
                  <MoreHorizontal className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem
                  onClick={(): void => handleOptimisticReorder(entry.id, 'top')}
                  disabled={!canMoveUp}
                >
                  <MoveUp className='h-4 w-4 mr-2' />
                  Move to Top
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(): void => handleOptimisticReorder(entry.id, 'up')}
                  disabled={!canMoveUp}
                >
                  <ArrowUp className='h-4 w-4 mr-2' />
                  Move Up
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(): void =>
                    handleOptimisticReorder(entry.id, 'down')
                  }
                  disabled={!canMoveDown}
                >
                  <ArrowDown className='h-4 w-4 mr-2' />
                  Move Down
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(): void =>
                    handleOptimisticReorder(entry.id, 'bottom')
                  }
                  disabled={!canMoveDown}
                >
                  <MoveDown className='h-4 w-4 mr-2' />
                  Move to Bottom
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
