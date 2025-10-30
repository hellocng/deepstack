'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from 'lucide-react'
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

interface PlayerAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableSessionId: string
  seatNumber: number
  waitlistEntries: WaitlistEntry[]
  onPlayerAssigned?: () => void
}

export function PlayerAssignmentDialog({
  open,
  onOpenChange,
  tableSessionId,
  seatNumber,
  waitlistEntries,
  onPlayerAssigned,
}: PlayerAssignmentDialogProps): JSX.Element {
  const [assigning, setAssigning] = useState(false)

  const handleAssignPlayer = async (entry: WaitlistEntry): Promise<void> => {
    setAssigning(true)
    try {
      const supabase = createClient()

      // Create player session
      const { data: _playerSession, error: sessionError } = await supabase
        .from('player_sessions')
        .insert({
          player_id: entry.player_id,
          table_session_id: tableSessionId,
          seat_number: seatNumber,
          start_time: new Date().toISOString(),
        })
        .select()
        .single()

      if (sessionError) {
        console.error('Error creating player session:', sessionError)
        return
      }

      // Update waitlist entry status to 'seated'
      const { error: updateError } = await supabase
        .from('waitlist_entries')
        .update({
          status: 'seated',
          updated_at: new Date().toISOString(),
        })
        .eq('id', entry.id)

      if (updateError) {
        console.error('Error updating waitlist entry:', updateError)
        return
      }

      onPlayerAssigned?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error assigning player:', error)
    } finally {
      setAssigning(false)
    }
  }

  const getAvailablePlayers = (): WaitlistEntry[] => {
    return waitlistEntries.filter(
      (entry) =>
        entry.status === 'waiting' ||
        entry.status === 'calledin' ||
        entry.status === 'notified'
    )
  }

  const availablePlayers = getAvailablePlayers()

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <User className='h-5 w-5' />
            Assign Player to Seat {seatNumber}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          {availablePlayers.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              <User className='h-12 w-12 mx-auto mb-4 opacity-50' />
              <p>No available players for this game.</p>
            </div>
          ) : (
            <div className='space-y-2 max-h-96 overflow-y-auto'>
              {availablePlayers.map((entry) => (
                <div
                  key={entry.id}
                  className='flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors'
                >
                  <div className='flex items-center gap-3'>
                    <Avatar className='w-10 h-10'>
                      <AvatarImage src={entry.player?.avatar_url || ''} />
                      <AvatarFallback>
                        {entry.player?.alias?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className='font-medium'>
                        {entry.player?.alias || 'Unknown Player'}
                      </div>
                      <div className='text-sm text-muted-foreground'>
                        {entry.game?.name} • {entry.game?.small_blind}/
                        {entry.game?.big_blind}
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <Button
                      size='sm'
                      onClick={() => handleAssignPlayer(entry)}
                      disabled={assigning}
                    >
                      {assigning ? 'Assigning...' : 'Assign'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
