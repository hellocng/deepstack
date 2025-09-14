'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tenant } from '@/types'
import { MapPin, Users, Gamepad2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface RoomCardProps {
  tenant: Tenant & {
    games?: Array<{
      id: string
      name: string
      game_type: string
      small_blind: number
      big_blind: number
      is_active: boolean
    }>
    tables?: Array<{
      id: string
      name: string
      seat_count: number
      status: string
    }>
  }
}

export function RoomCard({ tenant }: RoomCardProps): JSX.Element {
  // Remove duplicates from games and tables arrays
  const uniqueGames =
    tenant.games?.filter(
      (game, index, array) => array.findIndex((g) => g.id === game.id) === index
    ) || []

  const uniqueTables =
    tenant.tables?.filter(
      (table, index, array) =>
        array.findIndex((t) => t.id === table.id) === index
    ) || []

  // Calculate room statistics
  const activeGames = uniqueGames.filter((game) => game.is_active).length
  const openTables = uniqueTables.filter(
    (table) => table.status === 'open' || table.status === 'available'
  ).length

  const totalSeats = uniqueTables.reduce(
    (sum, table) => sum + table.seat_count,
    0
  )

  // Get unique game types
  const gameTypes = uniqueGames
    .filter((game) => game.is_active)
    .map((game) => game.game_type)
    .filter((type, index, array) => array.indexOf(type) === index)

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

  const _formatStakes = (smallBlind: number, bigBlind: number): string => {
    return `$${smallBlind}/${bigBlind}`
  }

  // Get stakes range
  const stakes = uniqueGames
    .filter((game) => game.is_active)
    .map((game) => ({ small: game.small_blind, big: game.big_blind }))

  const minStakes =
    stakes.length > 0 ? Math.min(...stakes.map((s) => s.small)) : 0
  const maxStakes =
    stakes.length > 0 ? Math.max(...stakes.map((s) => s.big)) : 0

  return (
    <Card className='hover:shadow-md transition-shadow'>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div className='flex items-center space-x-3'>
            {tenant.logo_url ? (
              <Image
                src={tenant.logo_url}
                alt={tenant.name}
                width={48}
                height={48}
                className='h-12 w-12 rounded'
              />
            ) : (
              <div className='h-12 w-12 rounded bg-primary flex items-center justify-center'>
                <span className='text-primary-foreground font-bold text-lg'>
                  {tenant.name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <CardTitle className='text-lg'>{tenant.name}</CardTitle>
              <p className='text-sm text-muted-foreground'>{tenant.code}</p>
            </div>
          </div>
          <Badge
            variant='outline'
            className='text-green-600 border-green-600'
          >
            Open
          </Badge>
        </div>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Location */}
        {tenant.address && (
          <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
            <MapPin className='h-4 w-4' />
            <span className='truncate'>{tenant.address}</span>
          </div>
        )}

        {/* Room Stats */}
        <div className='grid grid-cols-2 gap-4 text-sm'>
          <div className='flex items-center space-x-2'>
            <Gamepad2 className='h-4 w-4 text-muted-foreground' />
            <span>{activeGames} active games</span>
          </div>
          <div className='flex items-center space-x-2'>
            <Users className='h-4 w-4 text-muted-foreground' />
            <span>{totalSeats} total seats</span>
          </div>
        </div>

        {/* Table Status */}
        <div className='flex items-center justify-between text-sm'>
          <span className='text-muted-foreground'>
            {openTables} table{openTables !== 1 ? 's' : ''} available
          </span>
          {openTables > 0 && (
            <Badge
              variant='outline'
              className='text-green-600 border-green-600'
            >
              {openTables} Open
            </Badge>
          )}
        </div>

        {/* Game Types */}
        {gameTypes.length > 0 && (
          <div>
            <p className='text-sm font-medium mb-2'>Available Games:</p>
            <div className='flex flex-wrap gap-1'>
              {gameTypes.slice(0, 3).map((type) => (
                <Badge
                  key={type}
                  variant='secondary'
                  className='text-xs'
                >
                  {getGameTypeDisplay(type)}
                </Badge>
              ))}
              {gameTypes.length > 3 && (
                <Badge
                  variant='secondary'
                  className='text-xs'
                >
                  +{gameTypes.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Stakes Range */}
        {minStakes > 0 && maxStakes > 0 && (
          <div className='text-sm text-muted-foreground'>
            Stakes: ${minStakes}/${minStakes * 2} - ${maxStakes}/$
            {maxStakes * 2}
          </div>
        )}

        {/* Description */}
        {tenant.description && (
          <p className='text-sm text-muted-foreground line-clamp-2'>
            {tenant.description}
          </p>
        )}

        {/* Actions */}
        <div className='flex space-x-2 pt-2'>
          <Button
            className='flex-1'
            asChild
          >
            <Link href={`/${tenant.code}`}>
              <ExternalLink className='h-4 w-4 mr-2' />
              Visit Room
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
