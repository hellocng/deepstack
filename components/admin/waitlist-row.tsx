'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CountdownBadge } from '@/components/ui/countdown-badge'
import {
  Phone,
  CheckCircle,
  UserCheck,
  X,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  MoveUp,
  MoveDown,
  Undo2,
  Clock,
  MessageSquare,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  getStatusConfig,
  getTargetTime,
  type WaitlistStatus,
} from '@/lib/waitlist-status-utils'
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

interface WaitlistRowProps {
  entry: WaitlistEntry
  position: number
  onStatusChange: (entryId: string, newStatus: WaitlistStatus) => Promise<void>
  onAssignToTable: (entryId: string) => void
  onRowClick: (entry: WaitlistEntry) => void
  onExpired?: (entryId: string) => void
  onReorder?: (entryId: string, action: string) => void
}

export function WaitlistRow({
  entry,
  position: _position,
  onStatusChange,
  onAssignToTable,
  onRowClick,
  onExpired,
  onReorder,
}: WaitlistRowProps): JSX.Element {
  const [loading, setLoading] = useState(false)
  const status = entry.status as WaitlistStatus
  const config = getStatusConfig(status)
  const targetTime = getTargetTime(
    status,
    entry.notified_at || entry.checked_in_at,
    entry.created_at
  )

  const handleAction = async (action: string): Promise<void> => {
    setLoading(true)
    try {
      switch (action) {
        case 'call':
          await onStatusChange(entry.id, 'calledin')
          break
        case 'checkin':
          await onStatusChange(entry.id, 'waiting')
          break
        case 'notify':
          await onStatusChange(entry.id, 'notified')
          break
        case 'recall':
          await onStatusChange(entry.id, 'waiting')
          break
        case 'assign':
          onAssignToTable(entry.id)
          break
        case 'cancel':
          await onStatusChange(entry.id, 'cancelled')
          break
      }
    } finally {
      setLoading(false)
    }
  }

  const _getActionButton = (action: string): JSX.Element => {
    const actionConfig = {
      call: { icon: Phone, label: 'Call In', variant: 'default' as const },
      checkin: {
        icon: CheckCircle,
        label: 'Check In',
        variant: 'default' as const,
      },
      assign: {
        icon: UserCheck,
        label: 'Assign Seat',
        variant: 'default' as const,
      },
      cancel: { icon: X, label: 'Cancel', variant: 'destructive' as const },
    }

    const {
      icon: Icon,
      label,
      variant,
    } = actionConfig[action as keyof typeof actionConfig]

    return (
      <Button
        size='sm'
        variant={variant}
        onClick={() => handleAction(action)}
        disabled={loading}
        className='h-8'
      >
        <Icon className='h-3 w-3 mr-1' />
        {label}
      </Button>
    )
  }

  return (
    <div className='px-4 py-3 hover:bg-muted/30 transition-colors group'>
      <div className='grid grid-cols-12 items-center gap-4'>
        {/* Player Name - 4 columns */}
        <div
          className='col-span-4 flex items-center cursor-pointer'
          onClick={() => onRowClick(entry)}
        >
          <span className='font-medium truncate'>
            {entry.player?.alias || 'Unknown Player'}
          </span>
        </div>

        {/* Countdown - 2 columns */}
        <div className='col-span-2 flex items-center justify-center'>
          {config.showCountdown && targetTime && (
            <CountdownBadge
              targetTime={targetTime}
              onExpired={() => onExpired?.(entry.id)}
              variant='outline'
            />
          )}
        </div>

        {/* Time - 2 columns */}
        <div className='col-span-2 flex items-center justify-center'>
          <span className='text-sm text-muted-foreground'>
            {new Date(entry.created_at || '').toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
          </span>
        </div>

        {/* Status Badge - 2 columns */}
        <div className='col-span-2 flex items-center justify-center'>
          <Badge
            variant={config.variant}
            className='flex items-center gap-1'
          >
            {status === 'waiting' && <Clock className='h-3 w-3' />}
            {status === 'calledin' && <Phone className='h-3 w-3' />}
            {status === 'notified' && <MessageSquare className='h-3 w-3' />}
            {config.label}
          </Badge>
        </div>

        {/* Action Dropdown - 2 columns */}
        <div className='col-span-2 flex items-center justify-end'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size='sm'
                variant='outline'
                className='h-8 w-8 p-0'
                disabled={loading}
              >
                <MoreHorizontal className='h-3 w-3' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {/* Move Actions */}
              <DropdownMenuItem
                onClick={() => onReorder?.(entry.id, 'moveToTop')}
                disabled={loading}
              >
                <MoveUp className='h-3 w-3 mr-2' />
                Move to Top
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onReorder?.(entry.id, 'moveUp')}
                disabled={loading}
              >
                <ArrowUp className='h-3 w-3 mr-2' />
                Move Up
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onReorder?.(entry.id, 'moveDown')}
                disabled={loading}
              >
                <ArrowDown className='h-3 w-3 mr-2' />
                Move Down
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onReorder?.(entry.id, 'moveToBottom')}
                disabled={loading}
              >
                <MoveDown className='h-3 w-3 mr-2' />
                Move to Bottom
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Status Actions */}
              {config.actions.map((action) => (
                <DropdownMenuItem
                  key={action}
                  onClick={() => handleAction(action)}
                  disabled={loading}
                >
                  {action === 'checkin' && (
                    <CheckCircle className='h-3 w-3 mr-2' />
                  )}
                  {action === 'notify' && <Phone className='h-3 w-3 mr-2' />}
                  {action === 'recall' && <Undo2 className='h-3 w-3 mr-2' />}
                  {action === 'assign' && (
                    <UserCheck className='h-3 w-3 mr-2' />
                  )}
                  {action === 'cancel' && <X className='h-3 w-3 mr-2' />}
                  {action === 'call' && <Phone className='h-3 w-3 mr-2' />}
                  {action === 'checkin'
                    ? 'Check In'
                    : action === 'notify'
                      ? 'Notify'
                      : action === 'recall'
                        ? 'Recall'
                        : action === 'assign'
                          ? 'Assign Seat'
                          : action === 'cancel'
                            ? 'Cancel'
                            : action === 'call'
                              ? 'Call In'
                              : action}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
