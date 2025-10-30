'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Users, Phone } from 'lucide-react'
import { WaitlistJoinDialog } from './waitlist-join-dialog'
import type { Database } from '@/types/database'

type Game = Database['public']['Tables']['games']['Row']
type Room = Database['public']['Tables']['rooms']['Row']

interface WaitlistGameCardProps {
  game: Game
  room: Room
  waitlistCount: number
  estimatedWaitTime?: number
  onJoined: () => void
}

export function WaitlistGameCard({
  game,
  room,
  waitlistCount,
  estimatedWaitTime,
  onJoined,
}: WaitlistGameCardProps): JSX.Element {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false)

  const formatWaitTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const getWaitlistStatus = (): {
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    text: string
  } => {
    if (waitlistCount === 0) {
      return { variant: 'outline', text: 'No waitlist' }
    } else if (waitlistCount < 5) {
      return { variant: 'secondary', text: `${waitlistCount} waiting` }
    } else if (waitlistCount < 10) {
      return { variant: 'default', text: `${waitlistCount} waiting` }
    } else {
      return { variant: 'destructive', text: `${waitlistCount} waiting` }
    }
  }

  const status = getWaitlistStatus()

  return (
    <>
      <Card className='hover:shadow-md transition-shadow'>
        <CardHeader className='pb-3'>
          <div className='flex items-start justify-between'>
            <div className='flex-1 min-w-0'>
              <CardTitle className='text-lg font-semibold truncate'>
                {game.name}
              </CardTitle>
              <div className='flex items-center gap-2 mt-1'>
                <Badge
                  variant='outline'
                  className='text-xs'
                >
                  {game.game_type.replace('_', ' ').toUpperCase()}
                </Badge>
                <Badge
                  variant='secondary'
                  className='text-xs'
                >
                  ${game.small_blind}/${game.big_blind}
                </Badge>
              </div>
            </div>
            <Badge
              variant={status.variant}
              className='ml-2'
            >
              {status.text}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between text-sm text-muted-foreground'>
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-1'>
                <Users className='h-4 w-4' />
                <span>{waitlistCount} in line</span>
              </div>
              {estimatedWaitTime && (
                <div className='flex items-center gap-1'>
                  <Clock className='h-4 w-4' />
                  <span>~{formatWaitTime(estimatedWaitTime)}</span>
                </div>
              )}
            </div>
          </div>

          <div className='flex items-center justify-between'>
            <div className='text-sm'>
              {game.is_active ? (
                <span className='text-green-600 font-medium'>Active</span>
              ) : (
                <span className='text-muted-foreground'>Inactive</span>
              )}
            </div>
            <Button
              onClick={(): void => setJoinDialogOpen(true)}
              disabled={!game.is_active}
              size='sm'
            >
              <Phone className='h-4 w-4 mr-2' />
              Join Waitlist
            </Button>
          </div>
        </CardContent>
      </Card>

      <WaitlistJoinDialog
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
        games={[game]}
        room={room}
        onJoined={onJoined}
      />
    </>
  )
}
