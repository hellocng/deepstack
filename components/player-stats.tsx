'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Clock, Users, TrendingUp } from 'lucide-react'

interface PlayerStatsProps {
  playerId: string
  tenantId: string
}

export function PlayerStats({
  playerId: _playerId,
  tenantId: _tenantId,
}: PlayerStatsProps) {
  // This would fetch real data in a real implementation
  const stats = {
    gamesPlayed: 24,
    totalHours: 48,
    friendsCount: 12,
    winRate: 65,
  }

  const statItems = [
    {
      title: 'Games Played',
      value: stats.gamesPlayed,
      icon: Trophy,
      description: 'Total games this month',
    },
    {
      title: 'Hours Played',
      value: stats.totalHours,
      icon: Clock,
      description: 'Time at tables',
    },
    {
      title: 'Friends',
      value: stats.friendsCount,
      icon: Users,
      description: 'Connected players',
    },
    {
      title: 'Win Rate',
      value: `${stats.winRate}%`,
      icon: TrendingUp,
      description: 'Recent performance',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Stats</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {statItems.map((stat) => (
          <div
            key={stat.title}
            className='flex items-center justify-between'
          >
            <div className='flex items-center space-x-3'>
              <div className='p-2 bg-primary/10 rounded-lg'>
                <stat.icon className='h-4 w-4 text-primary' />
              </div>
              <div>
                <p className='text-sm font-medium'>{stat.title}</p>
                <p className='text-xs text-muted-foreground'>
                  {stat.description}
                </p>
              </div>
            </div>
            <div className='text-right'>
              <p className='text-lg font-bold'>{stat.value}</p>
            </div>
          </div>
        ))}

        <div className='pt-4 border-t'>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium'>Status</span>
            <Badge
              variant='outline'
              className='text-green-600 border-green-600'
            >
              Active Player
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
