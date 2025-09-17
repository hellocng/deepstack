'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Room } from '@/types'
import { MapPin, MessageCircle, MoreHorizontal } from 'lucide-react'

interface FriendCardProps {
  friend: {
    id: string
    alias: string
    avatar_url?: string
    last_login?: string
    friendshipId: string
    status: string
  }
  room: Room
}

export function FriendCard({
  friend,
  room: _room,
}: FriendCardProps): JSX.Element {
  const formatLastSeen = (lastLogin?: string): string => {
    if (!lastLogin) return 'Never'

    const now = new Date()
    const lastSeen = new Date(lastLogin)
    const diffMs = now.getTime() - lastSeen.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return 'Online now'
    if (diffMins < 60) return `${diffMins}m ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const isOnline =
    friend.last_login &&
    new Date().getTime() - new Date(friend.last_login).getTime() < 5 * 60 * 1000 // 5 minutes

  return (
    <Card className='hover:shadow-md transition-shadow'>
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='flex items-center space-x-3'>
            <div className='relative'>
              <Avatar className='h-12 w-12'>
                <AvatarImage src={friend.avatar_url || undefined} />
                <AvatarFallback>
                  {friend.alias.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isOnline && (
                <div className='absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background' />
              )}
            </div>
            <div>
              <CardTitle className='text-base'>{friend.alias}</CardTitle>
              <p className='text-sm text-muted-foreground'>
                {formatLastSeen(friend.last_login)}
              </p>
            </div>
          </div>
          <Button
            variant='ghost'
            size='sm'
          >
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </div>
      </CardHeader>

      <CardContent className='pt-0'>
        {/* Current Status */}
        <div className='mb-4'>
          {isOnline ? (
            <Badge
              variant='outline'
              className='text-green-600 border-green-600'
            >
              <div className='w-2 h-2 bg-green-500 rounded-full mr-2' />
              Online
            </Badge>
          ) : (
            <Badge variant='secondary'>Offline</Badge>
          )}
        </div>

        {/* Current Location (placeholder) */}
        <div className='flex items-center space-x-2 text-sm text-muted-foreground mb-4'>
          <MapPin className='h-4 w-4' />
          <span>Not currently playing</span>
        </div>

        {/* Actions */}
        <div className='flex space-x-2'>
          <Button
            variant='outline'
            size='sm'
            className='flex-1'
          >
            <MessageCircle className='h-4 w-4 mr-2' />
            Message
          </Button>
          <Button
            variant='outline'
            size='sm'
          >
            <MapPin className='h-4 w-4' />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
