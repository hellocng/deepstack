'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CheckCircle,
  X,
  MoveUp,
  MoveDown,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { WaitlistStatusManager } from '@/lib/waitlist-status-manager'
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

interface WaitlistBulkActionsProps {
  entries: WaitlistEntry[]
  onEntriesUpdated: () => void
  className?: string
}

export function WaitlistBulkActions({
  entries,
  onEntriesUpdated,
  className = '',
}: WaitlistBulkActionsProps): JSX.Element | null {
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<string>('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSelectAll = (checked: boolean): void => {
    if (checked) {
      setSelectedEntries(new Set(entries.map((entry) => entry.id)))
    } else {
      setSelectedEntries(new Set())
    }
  }

  const handleSelectEntry = (entryId: string, checked: boolean): void => {
    const newSelected = new Set(selectedEntries)
    if (checked) {
      newSelected.add(entryId)
    } else {
      newSelected.delete(entryId)
    }
    setSelectedEntries(newSelected)
  }

  const handleBulkAction = (): void => {
    if (selectedEntries.size === 0 || !bulkAction) return
    setShowConfirmDialog(true)
  }

  const executeBulkAction = async (): Promise<void> => {
    if (selectedEntries.size === 0 || !bulkAction) return

    setIsProcessing(true)
    try {
      const entryIds = Array.from(selectedEntries)

      switch (bulkAction) {
        case 'checkin':
          for (const entryId of entryIds) {
            await WaitlistStatusManager.checkInPlayer(entryId)
          }
          break

        case 'notify':
          for (const entryId of entryIds) {
            await WaitlistStatusManager.notifyPlayer(entryId)
          }
          break

        case 'cancel':
          for (const entryId of entryIds) {
            await WaitlistStatusManager.cancelEntry(entryId, 'staff')
          }
          break

        case 'expire':
          for (const entryId of entryIds) {
            await WaitlistStatusManager.expireEntry(entryId)
          }
          break

        case 'moveup':
          // Move selected entries up by 1 position
          for (const entryId of entryIds) {
            const response = await fetch(
              `/api/rooms/[room]/waitlist/${entryId}/move-up`,
              {
                method: 'POST',
              }
            )
            if (!response.ok) {
              console.error(`Failed to move entry ${entryId} up`)
            }
          }
          break

        case 'movedown':
          // Move selected entries down by 1 position
          for (const entryId of entryIds) {
            const response = await fetch(
              `/api/rooms/[room]/waitlist/${entryId}/move-down`,
              {
                method: 'POST',
              }
            )
            if (!response.ok) {
              console.error(`Failed to move entry ${entryId} down`)
            }
          }
          break
      }

      // Clear selection and refresh
      setSelectedEntries(new Set())
      setBulkAction('')
      onEntriesUpdated()
    } catch (error) {
      console.error('Error executing bulk action:', error)
    } finally {
      setIsProcessing(false)
      setShowConfirmDialog(false)
    }
  }

  const getActionDescription = (): string => {
    const count = selectedEntries.size
    const action = bulkAction

    switch (action) {
      case 'checkin':
        return `Check in ${count} player${count > 1 ? 's' : ''}`
      case 'notify':
        return `Notify ${count} player${count > 1 ? 's' : ''} of available seats`
      case 'cancel':
        return `Cancel ${count} waitlist entr${count > 1 ? 'ies' : 'y'}`
      case 'expire':
        return `Expire ${count} waitlist entr${count > 1 ? 'ies' : 'y'}`
      case 'moveup':
        return `Move ${count} entr${count > 1 ? 'ies' : 'y'} up`
      case 'movedown':
        return `Move ${count} entr${count > 1 ? 'ies' : 'y'} down`
      default:
        return `Perform action on ${count} entr${count > 1 ? 'ies' : 'y'}`
    }
  }

  if (entries.length === 0) {
    return null
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-sm font-medium'>Bulk Actions</CardTitle>
            <Badge variant='outline'>{selectedEntries.size} selected</Badge>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Select All */}
          <div className='flex items-center space-x-2'>
            <Checkbox
              id='select-all'
              checked={selectedEntries.size === entries.length}
              onCheckedChange={handleSelectAll}
            />
            <label
              htmlFor='select-all'
              className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
            >
              Select All ({entries.length})
            </label>
          </div>

          {/* Entry Selection */}
          <div className='max-h-48 overflow-y-auto space-y-2'>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className='flex items-center space-x-2 p-2 border rounded'
              >
                <Checkbox
                  id={entry.id}
                  checked={selectedEntries.has(entry.id)}
                  onCheckedChange={(checked): void =>
                    handleSelectEntry(entry.id, checked as boolean)
                  }
                />
                <label
                  htmlFor={entry.id}
                  className='flex-1 text-sm cursor-pointer'
                >
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>
                      {entry.player?.alias || 'Unknown Player'}
                    </span>
                    <Badge
                      variant='outline'
                      className='text-xs'
                    >
                      {entry.game?.name || 'Unknown Game'}
                    </Badge>
                  </div>
                </label>
              </div>
            ))}
          </div>

          {/* Action Selection */}
          {selectedEntries.size > 0 && (
            <div className='space-y-2'>
              <Select
                value={bulkAction}
                onValueChange={setBulkAction}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select action...' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='checkin'>
                    <div className='flex items-center gap-2'>
                      <CheckCircle className='h-4 w-4' />
                      Check In
                    </div>
                  </SelectItem>
                  <SelectItem value='notify'>
                    <div className='flex items-center gap-2'>
                      <AlertTriangle className='h-4 w-4' />
                      Notify
                    </div>
                  </SelectItem>
                  <SelectItem value='cancel'>
                    <div className='flex items-center gap-2'>
                      <X className='h-4 w-4' />
                      Cancel
                    </div>
                  </SelectItem>
                  <SelectItem value='expire'>
                    <div className='flex items-center gap-2'>
                      <Trash2 className='h-4 w-4' />
                      Expire
                    </div>
                  </SelectItem>
                  <SelectItem value='moveup'>
                    <div className='flex items-center gap-2'>
                      <MoveUp className='h-4 w-4' />
                      Move Up
                    </div>
                  </SelectItem>
                  <SelectItem value='movedown'>
                    <div className='flex items-center gap-2'>
                      <MoveDown className='h-4 w-4' />
                      Move Down
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleBulkAction}
                disabled={!bulkAction || isProcessing}
                className='w-full'
              >
                {isProcessing ? 'Processing...' : 'Execute Action'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Action</DialogTitle>
            <DialogDescription>
              {getActionDescription()}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className='flex justify-end gap-2'>
            <Button
              variant='outline'
              onClick={(): void => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={executeBulkAction}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
