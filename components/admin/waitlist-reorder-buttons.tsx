'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  ChevronUp,
  ChevronDown,
  ArrowUpToLine,
  ArrowDownToLine,
  MoreVertical,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useOperator } from '@/lib/auth/user-context'
import { toast } from 'sonner'

interface WaitlistReorderButtonsProps {
  entryId: string
  onReorder?: () => void
  onOptimisticReorder?: (entryId: string, action: string) => void
  className?: string
}

export function WaitlistReorderButtons({
  entryId,
  onReorder,
  onOptimisticReorder,
  className = '',
}: WaitlistReorderButtonsProps): JSX.Element {
  const [loading, setLoading] = useState<string | null>(null)
  const operator = useOperator()

  const handleMove = async (action: string): Promise<void> => {
    if (!operator?.profile?.room_id) {
      toast.error('Room not found')
      return
    }

    setLoading(action)

    // Optimistic update - immediately update UI
    onOptimisticReorder?.(entryId, action)

    try {
      const response = await fetch(
        `/api/rooms/${operator.profile.room_id}/waitlist/${entryId}/${action}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          return
        }
        const error = await response.json()
        throw new Error(error.error || 'Failed to move entry')
      }

      toast.success(`Entry moved ${action.replace('-', ' ')}`)
      onReorder?.()
    } catch (error) {
      console.error(`Error moving entry ${action}:`, error)
      toast.error(`Failed to move entry ${action.replace('-', ' ')}`)
      // Revert optimistic update by calling onReorder again
      onReorder?.()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Quick move buttons */}
      <Button
        variant='ghost'
        size='sm'
        onClick={() => handleMove('move-up')}
        disabled={loading === 'move-up'}
        className='h-8 w-8 p-0'
        title='Move up'
      >
        <ChevronUp className='h-4 w-4' />
      </Button>

      <Button
        variant='ghost'
        size='sm'
        onClick={() => handleMove('move-down')}
        disabled={loading === 'move-down'}
        className='h-8 w-8 p-0'
        title='Move down'
      >
        <ChevronDown className='h-4 w-4' />
      </Button>

      {/* Advanced move options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0'
            title='More options'
          >
            <MoreVertical className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem
            onClick={() => handleMove('move-to-top')}
            disabled={loading === 'move-to-top'}
          >
            <ArrowUpToLine className='h-4 w-4 mr-2' />
            Move to Top
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleMove('move-to-bottom')}
            disabled={loading === 'move-to-bottom'}
          >
            <ArrowDownToLine className='h-4 w-4 mr-2' />
            Move to Bottom
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
