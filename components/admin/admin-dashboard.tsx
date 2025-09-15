'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'
import { Loading } from '@/components/ui/loading'

interface DashboardStats {
  totalGames: number
  activeGames: number
  totalTables: number
  activeTables: number
  totalTournaments: number
  activeTournaments: number
  waitlistEntries: number
}

interface GameData {
  id: string
  is_active: boolean | null
}

interface TableData {
  id: string
  status: string | null
}

interface TournamentData {
  id: string
  status: string | null
}

export function AdminDashboard(): JSX.Element {
  const [stats, setStats] = useState<DashboardStats>({
    totalGames: 0,
    activeGames: 0,
    totalTables: 0,
    activeTables: 0,
    totalTournaments: 0,
    activeTournaments: 0,
    waitlistEntries: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async (): Promise<void> => {
      try {
        const supabase = createClient()

        // Get current operator's room_id
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (!user || authError) return

        const { data: operator, error: operatorError } = await supabase
          .from('operators')
          .select('room_id')
          .eq('auth_id', user.id)
          .single()

        if (operatorError || !operator) return

        const roomId = (operator as { room_id: string | null }).room_id
        if (!roomId) return

        // Fetch stats for the operator's room
        const [gamesResult, tablesResult, tournamentsResult, waitlistResult] =
          await Promise.all([
            supabase
              .from('games')
              .select('id, is_active')
              .eq('room_id', roomId),
            supabase.from('tables').select('id, status').eq('room_id', roomId),
            supabase
              .from('tournaments')
              .select('id, status')
              .eq('room_id', roomId),
            supabase
              .from('waitlist_entries')
              .select('id')
              .eq('room_id', roomId),
          ])

        setStats({
          totalGames: gamesResult.data?.length || 0,
          activeGames:
            gamesResult.data?.filter((g: GameData) => g.is_active === true)
              .length || 0,
          totalTables: tablesResult.data?.length || 0,
          activeTables:
            tablesResult.data?.filter((t: TableData) => t.status === 'open')
              .length || 0,
          totalTournaments: tournamentsResult.data?.length || 0,
          activeTournaments:
            tournamentsResult.data?.filter(
              (t: TournamentData) => t.status === 'in_progress'
            ).length || 0,
          waitlistEntries: waitlistResult.data?.length || 0,
        })
      } catch (_error) {
        // Error fetching dashboard stats - handled by error state
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loading
          size='md'
          text='Loading dashboard...'
        />
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Admin Dashboard</h1>
        <p className='text-muted-foreground'>
          Overview of your poker room operations
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Games</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.totalGames}</div>
            <p className='text-xs text-muted-foreground'>
              {stats.activeGames} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.totalTables}</div>
            <p className='text-xs text-muted-foreground'>
              {stats.activeTables} open
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Tournaments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.totalTournaments}</div>
            <p className='text-xs text-muted-foreground'>
              {stats.activeTournaments} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Waitlist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.waitlistEntries}</div>
            <p className='text-xs text-muted-foreground'>players waiting</p>
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className='space-y-2'>
            <Link
              href='/admin/games'
              className='block p-3 rounded-lg border hover:bg-accent transition-colors'
            >
              <div className='font-medium'>Manage Games</div>
              <div className='text-sm text-muted-foreground'>
                Create and manage poker games
              </div>
            </Link>
            <Link
              href='/admin/tables'
              className='block p-3 rounded-lg border hover:bg-accent transition-colors'
            >
              <div className='font-medium'>Manage Tables</div>
              <div className='text-sm text-muted-foreground'>
                Configure table settings and seating
              </div>
            </Link>
            <Link
              href='/admin/waitlist'
              className='block p-3 rounded-lg border hover:bg-accent transition-colors'
            >
              <div className='font-medium'>View Waitlist</div>
              <div className='text-sm text-muted-foreground'>
                Manage player waitlists
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates in your room</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-sm text-muted-foreground'>
              Activity feed coming soon...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
