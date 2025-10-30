'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CountdownBadge } from '@/components/ui/countdown-badge'
import {
  Phone,
  UserCheck,
  Clock,
  MessageSquare,
  MapPin,
  MessageCircle,
  CircleSlash,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  ListChevronsUpDown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
    phone_number?: string | null
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
  const canNotify = Boolean(entry.player?.phone_number)

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

  const getActionButtons = (): JSX.Element[] => {
    const buttons: JSX.Element[] = []

    if (status === 'calledin') {
      // Call In status: Check In, Seat, Cancel
      buttons.push(
        <Button
          key='checkin'
          size='sm'
          variant='outline'
          onClick={() => handleAction('checkin')}
          disabled={loading}
          className='h-8 w-8 p-0'
          title='Check In'
        >
          <MapPin className='h-4 w-4' />
        </Button>
      )
    } else if (status === 'waiting') {
      // Waiting status: Notify, Seat, Cancel
      buttons.push(
        <Button
          key='notify'
          size='sm'
          variant='outline'
          onClick={() => handleAction('notify')}
          disabled={loading || !canNotify}
          className='h-8 w-8 p-0'
          title={canNotify ? 'Notify' : 'Player has no phone number'}
        >
          <MessageCircle className='h-4 w-4' />
        </Button>
      )
    }

    // Seat button (common for both statuses)
    buttons.push(
      <Button
        key='assign'
        size='sm'
        variant='outline'
        onClick={() => handleAction('assign')}
        disabled={loading}
        className='h-8 w-8 p-0'
        title='Seat Player'
      >
        <UserCheck className='h-4 w-4' />
      </Button>
    )

    // Cancel button (common for both statuses)
    buttons.push(
      <Button
        key='cancel'
        size='sm'
        variant='destructive'
        onClick={() => handleAction('cancel')}
        disabled={loading}
        className='h-8 w-8 p-0'
        title='Cancel Entry'
      >
        <CircleSlash className='h-4 w-4' />
      </Button>
    )

    return buttons
  }

  return (
    <div className='px-4 py-3 hover:bg-muted/30 transition-colors group'>
      <div className='grid grid-cols-12 items-center gap-4'>
        {/* Player Name - 3 columns */}
        <div
          className='col-span-3 flex items-center cursor-pointer'
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

        {/* Status Badge - 1 column */}
        <div className='col-span-1 flex items-center justify-center'>
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

        {/* All Buttons Grouped - 4 columns */}
        <div className='col-span-4 flex items-center justify-end'>
          <div className='flex items-center'>
            {/* Action Buttons */}
            {getActionButtons().map((button, index) => {
              const isLast = index === getActionButtons().length - 1
              const isFirst = index === 0
              const isSeatButton = button.key === 'assign'

              return (
                <div key={button.key}>
                  {React.cloneElement(button, {
                    className: `h-8 w-8 p-0 ${isFirst ? 'rounded-l-none' : ''} ${isLast ? 'rounded-r-none' : 'rounded-none'}`,
                  })}

                  {/* Insert Move Controls after Seat button */}
                  {isSeatButton && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-8 w-8 p-0 rounded-none'
                          disabled={loading}
                          title='Move Player'
                        >
                          <ListChevronsUpDown className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                          onClick={() => onReorder?.(entry.id, 'move-to-top')}
                          disabled={loading}
                        >
                          <ChevronsUp className='h-4 w-4 mr-2' />
                          Move to Top
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onReorder?.(entry.id, 'move-up')}
                          disabled={loading}
                        >
                          <ChevronUp className='h-4 w-4 mr-2' />
                          Move Up
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onReorder?.(entry.id, 'move-down')}
                          disabled={loading}
                        >
                          <ChevronDown className='h-4 w-4 mr-2' />
                          Move Down
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            onReorder?.(entry.id, 'move-to-bottom')
                          }
                          disabled={loading}
                        >
                          <ChevronsDown className='h-4 w-4 mr-2' />
                          Move to Bottom
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
