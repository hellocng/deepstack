'use client'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MapPin, Phone, Globe, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRoomsData } from '@/lib/hooks/use-rooms-data'
import { Loading } from '@/components/ui/loading'

export default function RoomsPage(): JSX.Element {
  const router = useRouter()
  const { rooms, loading, error, refetch } = useRoomsData()

  if (loading) {
    return (
      <div className='container mx-auto px-4 py-6'>
        <Loading
          fullScreen
          size='md'
          text='Loading rooms...'
        />
      </div>
    )
  }

  if (error) {
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
        <div className='text-center py-8'>
          <p className='text-destructive mb-4'>Error loading rooms: {error}</p>
          <Button
            onClick={refetch}
            variant='outline'
          >
            <RefreshCw className='h-4 w-4 mr-2' />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (rooms.length === 0) {
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
        <div className='text-center py-8'>
          <p className='text-muted-foreground mb-4'>
            No poker rooms available at the moment.
          </p>
          <Button
            onClick={refetch}
            variant='outline'
          >
            <RefreshCw className='h-4 w-4 mr-2' />
            Refresh
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='container mx-auto px-4 py-6'>
      <div className='flex items-center justify-between mb-8'>
        <div className='flex items-center gap-4'>
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
        <Button
          onClick={refetch}
          variant='outline'
          size='sm'
        >
          <RefreshCw className='h-4 w-4 mr-2' />
          Refresh
        </Button>
      </div>

      <div className='space-y-8'>
        {rooms.map((room) => (
          <div
            key={room.id}
            className='space-y-4'
          >
            {/* Room Header */}
            <div className='flex items-start justify-between'>
              <div>
                <h2 className='text-xl font-semibold'>{room.name}</h2>
                <div className='flex items-center gap-4 text-sm text-muted-foreground mt-1'>
                  {room.address && (
                    <div className='flex items-center gap-1'>
                      <MapPin className='h-3 w-3' />
                      {room.address}
                    </div>
                  )}
                  {room.phone && (
                    <div className='flex items-center gap-1'>
                      <Phone className='h-3 w-3' />
                      {room.phone}
                    </div>
                  )}
                  {room.website_url && (
                    <div className='flex items-center gap-1'>
                      <Globe className='h-3 w-3' />
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
              </div>
            </div>

            {/* Games Table */}
            {room.games.length > 0 ? (
              <div className='border rounded-lg'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-1/3'>Game</TableHead>
                      <TableHead className='w-1/3'>Tables Open</TableHead>
                      <TableHead className='w-1/3'>Waitlist</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {room.games.map((game) => (
                      <TableRow key={game.id}>
                        <TableCell className='font-medium w-1/3'>
                          {game.name}
                        </TableCell>
                        <TableCell className='w-1/3'>
                          {game.tables_open}
                        </TableCell>
                        <TableCell className='w-1/3'>
                          <div className='flex items-center gap-2'>
                            {game.called_count > 0 && (
                              <Badge variant='outline'>
                                {game.called_count} called in
                              </Badge>
                            )}
                            {game.checked_in_count > 0 && (
                              <Badge variant='secondary'>
                                {game.checked_in_count} live
                              </Badge>
                            )}
                            {game.called_count === 0 &&
                              game.checked_in_count === 0 && (
                                <span className='text-muted-foreground'>-</span>
                              )}
                            {/* Debug info - remove after fixing */}
                            <span className='text-xs text-muted-foreground'>
                              (c:{game.called_count}, w:{game.checked_in_count})
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className='text-center py-8 text-muted-foreground'>
                <p>No games available at this room.</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
