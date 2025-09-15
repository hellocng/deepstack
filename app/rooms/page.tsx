'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MapPin, Phone, Globe, Users, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Tables } from '@/types/supabase'

type Room = Tables<'rooms'>

// Custom game type for the rooms page (different from the existing games table)
interface RoomGame {
  id: string
  room_id: string
  game_type:
    | 'texas_holdem'
    | 'omaha'
    | 'seven_card_stud'
    | 'five_card_draw'
    | 'razz'
    | 'stud_hi_lo'
  stakes: string
  max_players: number
  current_players: number
  waitlist_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface RoomWithGames extends Room {
  games: RoomGame[]
}

export default function RoomsPage(): JSX.Element {
  const router = useRouter()
  const [rooms, setRooms] = useState<RoomWithGames[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Replace with actual Supabase query when database is set up
    // For now, using mock data
    const mockRooms: RoomWithGames[] = [
      {
        id: '1',
        code: 'the-card-room',
        name: 'The Card Room',
        description:
          'Premium poker room with 20+ tables and professional dealers',
        address: '123 Main St, Downtown',
        phone: '555-0123',
        contact_email: 'info@thecardroom.com',
        logo_url: null,
        website_url: 'https://thecardroom.com',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        games: [
          {
            id: '1',
            room_id: '1',
            game_type: 'texas_holdem',
            stakes: '1/2',
            max_players: 9,
            current_players: 7,
            waitlist_count: 3,
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: '2',
            room_id: '1',
            game_type: 'texas_holdem',
            stakes: '2/5',
            max_players: 9,
            current_players: 9,
            waitlist_count: 5,
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: '3',
            room_id: '1',
            game_type: 'omaha',
            stakes: '2/5',
            max_players: 8,
            current_players: 6,
            waitlist_count: 2,
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      },
      {
        id: '2',
        code: 'lucky-7-casino',
        name: 'Lucky 7 Casino',
        description: 'Full service casino with dedicated poker room',
        address: '456 Casino Blvd, Entertainment District',
        phone: '555-0456',
        contact_email: 'info@lucky7casino.com',
        logo_url: null,
        website_url: 'https://lucky7casino.com',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        games: [
          {
            id: '4',
            room_id: '2',
            game_type: 'texas_holdem',
            stakes: '1/2',
            max_players: 9,
            current_players: 5,
            waitlist_count: 1,
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: '5',
            room_id: '2',
            game_type: 'texas_holdem',
            stakes: '5/10',
            max_players: 9,
            current_players: 8,
            waitlist_count: 4,
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      },
      {
        id: '3',
        code: 'players-club',
        name: 'Players Club',
        description: 'Members-only poker club with high-stakes games',
        address: '789 Club Ave, Uptown',
        phone: '555-0789',
        contact_email: 'info@playersclub.com',
        logo_url: null,
        website_url: 'https://playersclub.com',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        games: [
          {
            id: '6',
            room_id: '3',
            game_type: 'texas_holdem',
            stakes: '2/5',
            max_players: 9,
            current_players: 9,
            waitlist_count: 6,
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: '7',
            room_id: '3',
            game_type: 'seven_card_stud',
            stakes: '5/10',
            max_players: 8,
            current_players: 4,
            waitlist_count: 0,
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      },
    ]

    // Simulate loading
    setTimeout(() => {
      setRooms(mockRooms)
      setLoading(false)
    }, 500)
  }, [])

  const formatGameType = (gameType: string): string => {
    const types: Record<string, string> = {
      texas_holdem: "No Limit Hold'em",
      omaha: 'Pot Limit Omaha',
      seven_card_stud: 'Seven Card Stud',
      five_card_draw: 'Five Card Draw',
      razz: 'Razz',
      stud_hi_lo: 'Stud Hi/Lo',
    }
    return types[gameType] || gameType
  }

  const getGameStatusColor = (
    currentPlayers: number,
    maxPlayers: number,
    waitlistCount: number
  ): string => {
    if (currentPlayers < maxPlayers)
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    if (waitlistCount > 0)
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  const getGameStatusText = (
    currentPlayers: number,
    maxPlayers: number,
    waitlistCount: number
  ): string => {
    if (currentPlayers < maxPlayers)
      return `${maxPlayers - currentPlayers} seats available`
    if (waitlistCount > 0) return `${waitlistCount} on waitlist`
    return 'Full'
  }

  if (loading) {
    return (
      <div className='container mx-auto px-4 py-6'>
        <div className='flex items-center gap-4 mb-8'>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={() => router.back()}
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <h1 className='text-2xl font-bold'>Poker Rooms</h1>
        </div>
        <div className='grid gap-6'>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className='h-6 bg-muted animate-pulse rounded w-1/3 mb-2' />
                <div className='h-4 bg-muted animate-pulse rounded w-2/3' />
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  <div className='h-4 bg-muted animate-pulse rounded w-full' />
                  <div className='h-4 bg-muted animate-pulse rounded w-3/4' />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='container mx-auto px-4 py-6'>
      <div className='flex items-center gap-4 mb-8'>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8'
          onClick={() => router.back()}
        >
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <h1 className='text-2xl font-bold'>Poker Rooms</h1>
      </div>

      <div className='grid gap-6'>
        {rooms.map((room) => (
          <Card key={room.id}>
            <CardHeader>
              <div className='flex items-start justify-between'>
                <div>
                  <CardTitle className='text-xl'>{room.name}</CardTitle>
                  <CardDescription className='mt-1'>
                    {room.description}
                  </CardDescription>
                </div>
                <Badge variant={room.is_active ? 'default' : 'secondary'}>
                  {room.is_active ? 'Open' : 'Closed'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {/* Room Info */}
                <div className='flex flex-wrap gap-4 text-sm text-muted-foreground'>
                  {room.address && (
                    <div className='flex items-center gap-1'>
                      <MapPin className='h-4 w-4' />
                      <span>{room.address}</span>
                    </div>
                  )}
                  {room.phone && (
                    <div className='flex items-center gap-1'>
                      <Phone className='h-4 w-4' />
                      <span>{room.phone}</span>
                    </div>
                  )}
                  {room.website_url && (
                    <div className='flex items-center gap-1'>
                      <Globe className='h-4 w-4' />
                      <a
                        href={room.website_url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='hover:underline'
                      >
                        Website
                      </a>
                    </div>
                  )}
                </div>

                {/* Games */}
                <div>
                  <h3 className='font-semibold mb-3 flex items-center gap-2'>
                    <Users className='h-4 w-4' />
                    Active Games ({room.games.length})
                  </h3>
                  <div className='grid gap-3'>
                    {room.games.map((game) => (
                      <div
                        key={game.id}
                        className='flex items-center justify-between p-3 border rounded-lg'
                      >
                        <div className='flex items-center gap-3'>
                          <div>
                            <div className='font-medium'>
                              {formatGameType(game.game_type!)} {game.stakes}
                            </div>
                            <div className='text-sm text-muted-foreground'>
                              {game.current_players}/{game.max_players} players
                            </div>
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Badge
                            className={getGameStatusColor(
                              game.current_players!,
                              game.max_players!,
                              game.waitlist_count!
                            )}
                          >
                            {getGameStatusText(
                              game.current_players!,
                              game.max_players!,
                              game.waitlist_count!
                            )}
                          </Badge>
                          {game.waitlist_count! > 0 && (
                            <div className='flex items-center gap-1 text-sm text-muted-foreground'>
                              <Clock className='h-3 w-3' />
                              <span>{game.waitlist_count} waiting</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
