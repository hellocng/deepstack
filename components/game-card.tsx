'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Game, Tenant } from '@/types'
import { Users, Clock, DollarSign, Play } from 'lucide-react'

interface GameCardProps {
  game: Game & {
    tables?: Array<{
      id: string
      name: string
      seat_count: number
      status: string
    }>
  }
  tenant: Tenant
}

export function GameCard({ game, tenant: _tenant }: GameCardProps) {
  const formatStakes = (smallBlind: number, bigBlind: number) => {
    return `$${smallBlind}/${bigBlind}`
  }

  const formatBuyIn = (min: number, max: number) => {
    if (min === max) {
      return `$${min}`
    }
    return `$${min}-$${max}`
  }

  const getGameTypeDisplay = (gameType: string) => {
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

  const availableTables =
    game.tables?.filter(
      (table) => table.status === 'open' || table.status === 'available'
    ).length || 0

  const totalSeats =
    game.tables?.reduce((sum, table) => sum + table.seat_count, 0) || 0

  return (
    <Card className='hover:shadow-md transition-shadow'>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div>
            <CardTitle className='text-lg'>{game.name}</CardTitle>
            <p className='text-sm text-muted-foreground'>
              {getGameTypeDisplay(game.game_type)}
            </p>
          </div>
          <Badge variant='secondary'>
            {formatStakes(game.small_blind, game.big_blind)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Game Details */}
        <div className='grid grid-cols-2 gap-4 text-sm'>
          <div className='flex items-center space-x-2'>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
            <span>Buy-in: {formatBuyIn(game.min_buy_in, game.max_buy_in)}</span>
          </div>
          <div className='flex items-center space-x-2'>
            <Users className='h-4 w-4 text-muted-foreground' />
            <span>{totalSeats} seats</span>
          </div>
        </div>

        {/* Table Status */}
        <div className='flex items-center justify-between text-sm'>
          <span className='text-muted-foreground'>
            {availableTables} table{availableTables !== 1 ? 's' : ''} available
          </span>
          {availableTables > 0 && (
            <Badge
              variant='outline'
              className='text-green-600 border-green-600'
            >
              Open
            </Badge>
          )}
        </div>

        {/* Rake Info */}
        {game.rake && (
          <div className='text-sm text-muted-foreground'>Rake: {game.rake}</div>
        )}

        {/* Description */}
        {game.description && (
          <p className='text-sm text-muted-foreground line-clamp-2'>
            {game.description}
          </p>
        )}

        {/* Actions */}
        <div className='flex space-x-2 pt-2'>
          <Button
            className='flex-1'
            size='sm'
          >
            <Play className='h-4 w-4 mr-2' />
            Join Game
          </Button>
          <Button
            variant='outline'
            size='sm'
          >
            <Clock className='h-4 w-4 mr-2' />
            Waitlist
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
