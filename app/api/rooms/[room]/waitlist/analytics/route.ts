import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const analyticsQuerySchema = z.object({
  timeRange: z.enum(['24h', '7d', '30d']).default('7d'),
  gameId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ room: string }> }
): Promise<NextResponse> {
  try {
    const { room: roomId } = await params
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const queryParams = {
      timeRange: searchParams.get('timeRange') || '7d',
      gameId: searchParams.get('gameId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    }

    const validation = analyticsQuerySchema.safeParse(queryParams)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { timeRange, gameId, startDate, endDate } = validation.data

    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an operator for this room
    const { data: operator, error: operatorError } = await supabase
      .from('operators')
      .select('room_id, role')
      .eq('auth_id', user.id)
      .eq('room_id', roomId)
      .single()

    if (operatorError || !operator) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Calculate date range
    const now = new Date()
    let startDateFilter: Date
    let endDateFilter: Date

    if (startDate && endDate) {
      startDateFilter = new Date(startDate)
      endDateFilter = new Date(endDate)
    } else {
      const daysBack = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30
      startDateFilter = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
      endDateFilter = now
    }

    // Build query
    let query = supabase
      .from('waitlist_entries')
      .select(
        `
        *,
        player:players(id, alias, created_at),
        game:games(id, name, game_type, small_blind, big_blind)
      `
      )
      .eq('room_id', roomId)
      .gte('created_at', startDateFilter.toISOString())
      .lte('created_at', endDateFilter.toISOString())

    // Filter by game if specified
    if (gameId) {
      query = query.eq('game_id', gameId)
    }

    const { data: entries, error: entriesError } = await query

    if (entriesError) {
      console.error('Error fetching analytics data:', entriesError)
      return NextResponse.json(
        { error: 'Failed to fetch analytics data' },
        { status: 500 }
      )
    }

    // Calculate analytics
    const analytics = calculateWaitlistAnalytics(entries || [])

    return NextResponse.json({
      success: true,
      analytics,
      metadata: {
        timeRange,
        gameId,
        startDate: startDateFilter.toISOString(),
        endDate: endDateFilter.toISOString(),
        totalEntries: entries?.length || 0,
      },
    })
  } catch (error) {
    console.error('Error in waitlist analytics API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

interface AnalyticsResult {
  totalEntries: number
  statusBreakdown: Record<string, number>
  gameBreakdown: Record<string, number>
  hourlyDistribution: Record<string, number>
  dailyTrends: Record<string, number>
  averageWaitTime: number
  conversionRate: number
  peakHours: string[]
  topGames: Array<{ name: string; count: number }>
  averageEntriesPerHour: number
  mostActiveDay: string | null
  leastActiveDay: string | null
}

interface AnalyticsEntry {
  status?: string | null
  created_at?: string | null
  game?: { name?: string | null } | null
}

function calculateWaitlistAnalytics(
  entries: AnalyticsEntry[]
): AnalyticsResult {
  const totalEntries = entries.length

  if (totalEntries === 0) {
    return {
      totalEntries: 0,
      statusBreakdown: {},
      gameBreakdown: {},
      hourlyDistribution: {},
      averageWaitTime: 0,
      conversionRate: 0,
      peakHours: [],
      topGames: [],
      dailyTrends: {},
      averageEntriesPerHour: 0,
      mostActiveDay: null,
      leastActiveDay: null,
    }
  }

  // Status breakdown
  const statusBreakdown = entries.reduce(
    (acc, entry) => {
      const status = entry.status || 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // Game breakdown
  const gameBreakdown = entries.reduce(
    (acc, entry) => {
      const gameName = entry.game?.name || 'Unknown'
      acc[gameName] = (acc[gameName] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // Hourly distribution
  const hourlyDistribution = entries.reduce(
    (acc, entry) => {
      const hour = new Date(entry.created_at || '').getHours()
      const hourKey = `${hour.toString().padStart(2, '0')}:00`
      acc[hourKey] = (acc[hourKey] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // Daily trends
  const dailyTrends = entries.reduce(
    (acc, entry) => {
      const date = new Date(entry.created_at || '').toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // Calculate metrics
  const waitingEntries = entries.filter((e) => e.status === 'waiting')
  const averageWaitTime =
    waitingEntries.length > 0 ? waitingEntries.length * 15 : 0

  const seatedEntries = entries.filter((e) => e.status === 'seated').length
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

  // Most/least active days
  const dailyEntries = Object.entries(dailyTrends)
  const mostActiveDay =
    dailyEntries.length > 0
      ? dailyEntries.sort(([, a], [, b]) => b - a)[0][0]
      : null
  const leastActiveDay =
    dailyEntries.length > 0
      ? dailyEntries.sort(([, a], [, b]) => a - b)[0][0]
      : null

  // Average entries per hour
  const totalHours = Object.keys(hourlyDistribution).length
  const averageEntriesPerHour = totalHours > 0 ? totalEntries / totalHours : 0

  return {
    totalEntries,
    statusBreakdown,
    gameBreakdown,
    hourlyDistribution,
    dailyTrends,
    averageWaitTime,
    conversionRate,
    peakHours,
    topGames,
    averageEntriesPerHour,
    mostActiveDay,
    leastActiveDay,
  }
}
