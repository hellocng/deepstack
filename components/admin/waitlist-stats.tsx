'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Clock,
  Phone,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'
import type { Database } from '@/types/database'

type WaitlistEntry = Database['public']['Tables']['waitlist_entries']['Row'] & {
  player: {
    id: string
    alias: string | null
    avatar_url: string | null
  } | null
  game: {
    id: string
    name: string
    game_type: string
    small_blind: number
    big_blind: number
  } | null
}

interface WaitlistStatsProps {
  entries: WaitlistEntry[]
}

export function WaitlistStats({ entries }: WaitlistStatsProps): JSX.Element {
  // Calculate statistics
  const totalEntries = entries.length
  const waitingCount = entries.filter((e) => e.status === 'waiting').length
  const calledInCount = entries.filter((e) => e.status === 'calledin').length
  const notifiedCount = entries.filter((e) => e.status === 'notified').length
  const expiredCount = entries.filter((e) => e.status === 'expired').length
  const cancelledCount = entries.filter((e) => e.status === 'cancelled').length
  const seatedCount = entries.filter((e) => e.status === 'seated').length

  // Calculate average wait time (simplified - 15 minutes per position)
  const averageWaitTime = waitingCount > 0 ? waitingCount * 15 : 0

  // Calculate conversion rate (seated / total)
  const conversionRate =
    totalEntries > 0 ? (seatedCount / totalEntries) * 100 : 0

  // Derive additional metrics as needed

  const formatWaitTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
      {/* Total Entries */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium flex items-center gap-2'>
            <Users className='h-4 w-4 text-blue-600' />
            Total Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{totalEntries}</div>
          <p className='text-xs text-muted-foreground'>All time entries</p>
        </CardContent>
      </Card>

      {/* Active Waitlist */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium flex items-center gap-2'>
            <Clock className='h-4 w-4 text-green-600' />
            Active Waitlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>
            {waitingCount + calledInCount + notifiedCount}
          </div>
          <p className='text-xs text-muted-foreground'>Currently waiting</p>
        </CardContent>
      </Card>

      {/* Average Wait Time */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium flex items-center gap-2'>
            <TrendingUp className='h-4 w-4 text-orange-600' />
            Avg Wait Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>
            {formatWaitTime(averageWaitTime)}
          </div>
          <p className='text-xs text-muted-foreground'>Estimated time</p>
        </CardContent>
      </Card>

      {/* Conversion Rate */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium flex items-center gap-2'>
            <CheckCircle className='h-4 w-4 text-purple-600' />
            Conversion Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{conversionRate.toFixed(1)}%</div>
          <p className='text-xs text-muted-foreground'>Seated vs total</p>
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card className='md:col-span-2 lg:col-span-4'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium'>
            Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-wrap gap-2'>
            <Badge
              variant='default'
              className='flex items-center gap-1'
            >
              <CheckCircle className='h-3 w-3' />
              Waiting: {waitingCount}
            </Badge>
            <Badge
              variant='secondary'
              className='flex items-center gap-1'
            >
              <Phone className='h-3 w-3' />
              Called In: {calledInCount}
            </Badge>
            <Badge
              variant='outline'
              className='flex items-center gap-1'
            >
              <AlertCircle className='h-3 w-3' />
              Notified: {notifiedCount}
            </Badge>
            <Badge
              variant='destructive'
              className='flex items-center gap-1'
            >
              <Clock className='h-3 w-3' />
              Expired: {expiredCount}
            </Badge>
            <Badge
              variant='secondary'
              className='flex items-center gap-1'
            >
              <Users className='h-3 w-3' />
              Seated: {seatedCount}
            </Badge>
            <Badge
              variant='outline'
              className='flex items-center gap-1'
            >
              Cancelled: {cancelledCount}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
