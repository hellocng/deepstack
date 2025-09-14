'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Users, MapPin, Clock } from 'lucide-react'

export function FriendActivity(): JSX.Element {
  // This would fetch real data in a real implementation
  const friendActivity = [
    {
      id: '1',
      name: 'Alice',
      avatar: null,
      status: 'playing',
      location: "Table 3 - $2/$5 Hold'em",
      time: '2h ago',
    },
    {
      id: '2',
      name: 'Bob',
      avatar: null,
      status: 'waiting',
      location: 'Waitlist - $1/$2 Omaha',
      time: '30m ago',
    },
    {
      id: '3',
      name: 'Charlie',
      avatar: null,
      status: 'online',
      location: 'Browsing games',
      time: '5m ago',
    },
  ]

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'playing':
        return 'bg-green-500'
      case 'waiting':
        return 'bg-yellow-500'
      case 'online':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'playing':
        return 'Playing'
      case 'waiting':
        return 'Waiting'
      case 'online':
        return 'Online'
      default:
        return 'Offline'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center space-x-2'>
          <Users className='h-5 w-5' />
          <span>Friend Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {friendActivity.map((friend) => (
          <div
            key={friend.id}
            className='flex items-center space-x-3'
          >
            <div className='relative'>
              <Avatar className='h-10 w-10'>
                <AvatarImage src={friend.avatar} />
                <AvatarFallback>
                  {friend.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(friend.status)}`}
              />
            </div>

            <div className='flex-1 min-w-0'>
              <div className='flex items-center space-x-2 mb-1'>
                <p className='text-sm font-medium truncate'>{friend.name}</p>
                <Badge
                  variant='outline'
                  className='text-xs'
                >
                  {getStatusText(friend.status)}
                </Badge>
              </div>
              <div className='flex items-center space-x-1 text-xs text-muted-foreground'>
                <MapPin className='h-3 w-3' />
                <span className='truncate'>{friend.location}</span>
              </div>
              <div className='flex items-center space-x-1 text-xs text-muted-foreground'>
                <Clock className='h-3 w-3' />
                <span>{friend.time}</span>
              </div>
            </div>
          </div>
        ))}

        <Button
          variant='outline'
          className='w-full'
        >
          View All Friends
        </Button>
      </CardContent>
    </Card>
  )
}
