'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart3, TrendingUp, Clock, Users, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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

interface WaitlistAnalyticsProps {
  roomId: string
  entries: WaitlistEntry[]
}

interface AnalyticsData {
  totalEntries: number
  statusBreakdown: Record<string, number>
  gameBreakdown: Record<string, number>
  hourlyDistribution: Record<string, number>
  averageWaitTime: number
  conversionRate: number
  peakHours: string[]
  topGames: Array<{ name: string; count: number }>
}

export function WaitlistAnalytics({
  roomId,
  entries: _entries,
}: WaitlistAnalyticsProps): JSX.Element {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [selectedGame, setSelectedGame] = useState('all')

  const calculateAnalytics = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Calculate date range
      const now = new Date()
      const daysBack =
        timeRange === '24h'
          ? 1
          : timeRange === '7d'
            ? 7
            : timeRange === '30d'
              ? 30
              : 7
      const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

      // Get all entries for the time range
      const { data: allEntries, error } = await supabase
        .from('waitlist_entries')
        .select(
          `
          *,
          player:players(id, alias),
          game:games(id, name, game_type, small_blind, big_blind)
        `
        )
        .eq('room_id', roomId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching analytics data:', error)
        return
      }

      const filteredEntries = allEntries || []

      // Calculate analytics
      const totalEntries = filteredEntries.length

      // Status breakdown
      const statusBreakdown = filteredEntries.reduce(
        (acc, entry) => {
          const status = entry.status || 'unknown'
          acc[status] = (acc[status] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      // Game breakdown
      const gameBreakdown = filteredEntries.reduce(
        (acc, entry) => {
          const gameName = entry.game?.name || 'Unknown'
          acc[gameName] = (acc[gameName] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      // Hourly distribution
      const hourlyDistribution = filteredEntries.reduce(
        (acc, entry) => {
          const hour = new Date(entry.created_at || '').getHours()
          const hourKey = `${hour}:00`
          acc[hourKey] = (acc[hourKey] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      // Average wait time (simplified calculation)
      const waitingEntries = filteredEntries.filter(
        (e) => e.status === 'waiting'
      )
      const averageWaitTime =
        waitingEntries.length > 0 ? waitingEntries.length * 15 : 0

      // Conversion rate
      const seatedEntries = filteredEntries.filter(
        (e) => e.status === 'seated'
      ).length
      const conversionRate =
        totalEntries > 0 ? (seatedEntries / totalEntries) * 100 : 0

      // Peak hours (top 3 hours with most entries)
      const peakHours = Object.entries(hourlyDistribution)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => hour)

      // Top games
      const topGames = Object.entries(gameBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))

      setAnalyticsData({
        totalEntries,
        statusBreakdown,
        gameBreakdown,
        hourlyDistribution,
        averageWaitTime,
        conversionRate,
        peakHours,
        topGames,
      })
    } catch (error) {
      console.error('Error calculating analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [roomId, timeRange])

  useEffect(() => {
    calculateAnalytics()
  }, [calculateAnalytics])

  const exportData = (): void => {
    if (!analyticsData) return

    const csvData = [
      ['Metric', 'Value'],
      ['Total Entries', analyticsData.totalEntries.toString()],
      ['Average Wait Time (minutes)', analyticsData.averageWaitTime.toString()],
      ['Conversion Rate (%)', analyticsData.conversionRate.toFixed(2)],
      ['Peak Hours', analyticsData.peakHours.join(', ')],
      ['', ''],
      ['Status Breakdown', ''],
      ...Object.entries(analyticsData.statusBreakdown).map(
        ([status, count]) => [status, count.toString()]
      ),
      ['', ''],
      ['Game Breakdown', ''],
      ...Object.entries(analyticsData.gameBreakdown).map(([game, count]) => [
        game,
        count.toString(),
      ]),
    ]

    const csvContent = csvData.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `waitlist-analytics-${timeRange}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className='p-8 text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4'></div>
          <p>Loading analytics...</p>
        </CardContent>
      </Card>
    )
  }

  if (!analyticsData) {
    return (
      <Card>
        <CardContent className='p-8 text-center'>
          <p>No analytics data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Controls */}
      <Card>
        <CardContent className='p-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <Select
                value={timeRange}
                onValueChange={setTimeRange}
              >
                <SelectTrigger className='w-32'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='24h'>Last 24h</SelectItem>
                  <SelectItem value='7d'>Last 7 days</SelectItem>
                  <SelectItem value='30d'>Last 30 days</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedGame}
                onValueChange={setSelectedGame}
              >
                <SelectTrigger className='w-48'>
                  <SelectValue placeholder='All games' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Games</SelectItem>
                  {analyticsData.topGames.map((game) => (
                    <SelectItem
                      key={game.name}
                      value={game.name}
                    >
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={exportData}
              variant='outline'
            >
              <Download className='h-4 w-4 mr-2' />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium flex items-center gap-2'>
              <Users className='h-4 w-4 text-blue-600' />
              Total Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {analyticsData.totalEntries}
            </div>
            <p className='text-xs text-muted-foreground'>{timeRange} period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium flex items-center gap-2'>
              <Clock className='h-4 w-4 text-green-600' />
              Avg Wait Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {Math.round(analyticsData.averageWaitTime)}m
            </div>
            <p className='text-xs text-muted-foreground'>Estimated time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium flex items-center gap-2'>
              <TrendingUp className='h-4 w-4 text-purple-600' />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {analyticsData.conversionRate.toFixed(1)}%
            </div>
            <p className='text-xs text-muted-foreground'>Seated vs total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium flex items-center gap-2'>
              <BarChart3 className='h-4 w-4 text-orange-600' />
              Peak Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {analyticsData.peakHours.length > 0
                ? analyticsData.peakHours[0]
                : 'N/A'}
            </div>
            <p className='text-xs text-muted-foreground'>Busiest time</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs
        defaultValue='status'
        className='space-y-4'
      >
        <TabsList>
          <TabsTrigger value='status'>Status Breakdown</TabsTrigger>
          <TabsTrigger value='games'>Game Analysis</TabsTrigger>
          <TabsTrigger value='timing'>Timing Analysis</TabsTrigger>
        </TabsList>

        <TabsContent
          value='status'
          className='space-y-4'
        >
          <Card>
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {Object.entries(analyticsData.statusBreakdown).map(
                  ([status, count]) => {
                    const percentage =
                      (count / analyticsData.totalEntries) * 100
                    return (
                      <div
                        key={status}
                        className='flex items-center justify-between'
                      >
                        <div className='flex items-center gap-2'>
                          <Badge
                            variant='outline'
                            className='capitalize'
                          >
                            {status}
                          </Badge>
                          <span className='text-sm'>{count} entries</span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <div className='w-24 bg-gray-200 rounded-full h-2'>
                            <div
                              className='bg-blue-600 h-2 rounded-full'
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className='text-sm text-muted-foreground w-12'>
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value='games'
          className='space-y-4'
        >
          <Card>
            <CardHeader>
              <CardTitle>Game Popularity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {analyticsData.topGames.map((game, index) => {
                  const percentage =
                    (game.count / analyticsData.totalEntries) * 100
                  return (
                    <div
                      key={game.name}
                      className='flex items-center justify-between'
                    >
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-medium'>
                          #{index + 1}
                        </span>
                        <span className='text-sm'>{game.name}</span>
                        <Badge variant='secondary'>{game.count}</Badge>
                      </div>
                      <div className='flex items-center gap-2'>
                        <div className='w-24 bg-gray-200 rounded-full h-2'>
                          <div
                            className='bg-green-600 h-2 rounded-full'
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className='text-sm text-muted-foreground w-12'>
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value='timing'
          className='space-y-4'
        >
          <Card>
            <CardHeader>
              <CardTitle>Hourly Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                {Object.entries(analyticsData.hourlyDistribution)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([hour, count]) => {
                    const maxCount = Math.max(
                      ...Object.values(analyticsData.hourlyDistribution)
                    )
                    const percentage = (count / maxCount) * 100
                    return (
                      <div
                        key={hour}
                        className='flex items-center justify-between'
                      >
                        <span className='text-sm w-16'>{hour}</span>
                        <div className='flex-1 mx-4'>
                          <div className='w-full bg-gray-200 rounded-full h-2'>
                            <div
                              className='bg-orange-600 h-2 rounded-full'
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className='text-sm text-muted-foreground w-8'>
                          {count}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
