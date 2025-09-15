'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Room } from '@/types'
import { Gamepad2, Clock, Users, MapPin } from 'lucide-react'

interface QuickActionsProps {
  room: Room
}

export function QuickActions({ room }: QuickActionsProps): JSX.Element {
  const actions = [
    {
      title: 'Browse Games',
      description: 'Find available poker games',
      icon: Gamepad2,
      href: `/${room.code}/games`,
      variant: 'default' as const,
    },
    {
      title: 'Join Waitlist',
      description: 'Get on a waitlist for your favorite game',
      icon: Clock,
      href: `/${room.code}/waitlist`,
      variant: 'outline' as const,
    },
    {
      title: 'Find Friends',
      description: 'See where your friends are playing',
      icon: Users,
      href: `/${room.code}/friends`,
      variant: 'outline' as const,
    },
    {
      title: 'View Tables',
      description: 'See current table status',
      icon: MapPin,
      href: `/${room.code}/tables`,
      variant: 'outline' as const,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-2 gap-3'>
          {actions.map((action) => (
            <Button
              key={action.title}
              variant={action.variant}
              className='h-auto p-4 flex flex-col items-start space-y-2'
              asChild
            >
              <a href={action.href}>
                <action.icon className='h-5 w-5' />
                <div className='text-left'>
                  <div className='font-medium'>{action.title}</div>
                  <div className='text-xs opacity-70'>{action.description}</div>
                </div>
              </a>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
