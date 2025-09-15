'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tenant } from '@/types'
import { User } from 'lucide-react'

interface WaitlistCardProps {
  game: {
    id: string
    name: string
    game_type: string
    small_blind: number
    big_blind: number
  }
  entries: Array<{
    id: string
    position: number
    created_at: string
    players: {
      id: string
      alias: string
      avatar_url?: string
    }
  }>
  tenant: Tenant
}

export function WaitlistCard({
  game,
  entries,
  tenant: _tenant,
}: WaitlistCardProps): JSX.Element {
  const formatStakes = (smallBlind: number, bigBlind: number): string => {
    return `$${smallBlind}/${bigBlind}`
  }

  const getGameTypeDisplay = (gameType: string): string => {
    const types: Record<string, string> = {
      texas_holdem: "Texas Hold'em",
      omaha: 'Omaha',
      seven_card_stud: '7-Card Stud',
      five_card_draw: '5-Card Draw',
      razz: 'Razz',
      stud_hi_lo: 'Stud Hi/Lo',
    }
    return types[gameType] || gameType
  }

  const formatWaitTime = (createdAt: string): string => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 60) {
      return `${diffMins}m`
    }
    const diffHours = Math.floor(diffMins / 60)
    return `${diffHours}h ${diffMins % 60}m`
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div>
            <CardTitle className='text-lg'>{game.name}</CardTitle>
            <p className='text-sm text-muted-foreground'>
              {getGameTypeDisplay(game.game_type)} •{' '}
              {formatStakes(game.small_blind, game.big_blind)}
            </p>
          </div>
          <Badge variant='secondary'>{entries.length} waiting</Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Waitlist Entries */}
        <div className='space-y-3'>
          {entries.slice(0, 5).map((entry) => (
            <div
              key={entry.id}
              className='flex items-center justify-between'
            >
              <div className='flex items-center space-x-3'>
                <div className='flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium'>
                  {waitlistEntries.indexOf(entry) + 1}
                </div>
                <Avatar className='h-8 w-8'>
                  <AvatarImage src={entry.players.avatar_url} />
                  <AvatarFallback>
                    {entry.players.alias.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className='text-sm font-medium'>{entry.players.alias}</p>
                  <p className='text-xs text-muted-foreground'>
                    Waiting {formatWaitTime(entry.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {entries.length > 5 && (
            <div className='text-center text-sm text-muted-foreground'>
              +{entries.length - 5} more players waiting
            </div>
          )}
        </div>

        {/* Actions */}
        <div className='flex space-x-2 pt-4 border-t'>
          <Button
            className='flex-1'
            size='sm'
          >
            <User className='h-4 w-4 mr-2' />
            Join Waitlist
          </Button>
          <Button
            variant='outline'
            size='sm'
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
