'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Gamepad2, Users, Play } from 'lucide-react'

interface ActiveGamesProps {
  tenantId: string
}

export function ActiveGames({
  tenantId: _tenantId,
}: ActiveGamesProps): JSX.Element {
  // This would fetch real data in a real implementation
  const activeGames = [
    {
      id: '1',
      name: "Texas Hold'em",
      stakes: '$2/$5',
      players: 6,
      maxPlayers: 9,
      tables: 2,
    },
    {
      id: '2',
      name: 'Omaha Hi/Lo',
      stakes: '$1/$2',
      players: 4,
      maxPlayers: 8,
      tables: 1,
    },
    {
      id: '3',
      name: '7-Card Stud',
      stakes: '$5/$10',
      players: 3,
      maxPlayers: 7,
      tables: 1,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center space-x-2'>
          <Gamepad2 className='h-5 w-5' />
          <span>Active Games</span>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {activeGames.map((game) => (
          <div
            key={game.id}
            className='flex items-center justify-between p-3 border rounded-lg'
          >
            <div className='flex-1'>
              <div className='flex items-center space-x-2 mb-1'>
                <h4 className='font-medium'>{game.name}</h4>
                <Badge variant='secondary'>{game.stakes}</Badge>
              </div>
              <div className='flex items-center space-x-4 text-sm text-muted-foreground'>
                <div className='flex items-center space-x-1'>
                  <Users className='h-3 w-3' />
                  <span>
                    {game.players}/{game.maxPlayers}
                  </span>
                </div>
                <span>
                  {game.tables} table{game.tables !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <Button
              size='sm'
              variant='outline'
            >
              <Play className='h-3 w-3 mr-1' />
              Join
            </Button>
          </div>
        ))}

        <Button
          variant='outline'
          className='w-full'
        >
          View All Games
        </Button>
      </CardContent>
    </Card>
  )
}
