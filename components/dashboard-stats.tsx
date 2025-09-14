'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Gamepad2, Users, Clock, MapPin } from 'lucide-react'

interface DashboardStatsProps {
  tenantId: string
}

export function DashboardStats({
  tenantId: _tenantId,
}: DashboardStatsProps): JSX.Element {
  // This would fetch real data in a real implementation
  const stats = {
    activeGames: 8,
    totalPlayers: 24,
    waitlistCount: 12,
    availableTables: 5,
  }

  const statCards = [
    {
      title: 'Active Games',
      value: stats.activeGames,
      icon: Gamepad2,
      description: 'Games currently running',
    },
    {
      title: 'Players Online',
      value: stats.totalPlayers,
      icon: Users,
      description: 'Players at tables',
    },
    {
      title: 'Waitlist',
      value: stats.waitlistCount,
      icon: Clock,
      description: 'Players waiting',
    },
    {
      title: 'Available Tables',
      value: stats.availableTables,
      icon: MapPin,
      description: 'Open seats',
    },
  ]

  return (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{stat.title}</CardTitle>
            <stat.icon className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stat.value}</div>
            <p className='text-xs text-muted-foreground'>{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
