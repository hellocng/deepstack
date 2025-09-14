'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Gamepad2, Users, Trophy } from 'lucide-react'

interface RecentActivityProps {
  playerId: string
  tenantId: string
}

export function RecentActivity({
  playerId: _playerId,
  tenantId: _tenantId,
}: RecentActivityProps) {
  // This would fetch real data in a real implementation
  const activities = [
    {
      id: '1',
      type: 'game_joined',
      title: "Joined $2/$5 Hold'em",
      description: 'Table 3 - Seat 6',
      time: '2 hours ago',
      icon: Gamepad2,
      status: 'completed',
    },
    {
      id: '2',
      type: 'friend_added',
      title: 'Added Alice as friend',
      description: 'Friend request accepted',
      time: '1 day ago',
      icon: Users,
      status: 'completed',
    },
    {
      id: '3',
      type: 'waitlist_joined',
      title: 'Joined waitlist',
      description: '$1/$2 Omaha - Position 3',
      time: '2 days ago',
      icon: Clock,
      status: 'completed',
    },
    {
      id: '4',
      type: 'game_won',
      title: "Won $2/$5 Hold'em",
      description: 'Table 1 - +$150',
      time: '3 days ago',
      icon: Trophy,
      status: 'completed',
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'pending':
        return 'text-yellow-600'
      case 'cancelled':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {activities.map((activity) => (
          <div
            key={activity.id}
            className='flex items-start space-x-3'
          >
            <div className='p-2 bg-muted rounded-lg'>
              <activity.icon className='h-4 w-4' />
            </div>
            <div className='flex-1 min-w-0'>
              <div className='flex items-center space-x-2 mb-1'>
                <p className='text-sm font-medium truncate'>{activity.title}</p>
                <Badge
                  variant='outline'
                  className={`text-xs ${getStatusColor(activity.status)}`}
                >
                  {activity.status}
                </Badge>
              </div>
              <p className='text-xs text-muted-foreground mb-1'>
                {activity.description}
              </p>
              <p className='text-xs text-muted-foreground'>{activity.time}</p>
            </div>
          </div>
        ))}

        <Button
          variant='outline'
          className='w-full'
        >
          View All Activity
        </Button>
      </CardContent>
    </Card>
  )
}
