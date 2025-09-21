'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Loading } from '@/components/ui/loading'
import { useOperator } from '@/lib/auth/user-context'
import {
  Building2,
  Shield,
  BarChart3,
  Club,
  Table,
  Clock,
  Users,
  Gift,
  Trophy,
  LucideIcon,
} from 'lucide-react'

interface ConsoleStats {
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
  is_active: boolean
}

interface TournamentData {
  id: string
  status: string | null
}

interface ManagementCard {
  id: string
  title: string
  href: string
  icon: LucideIcon
  roles: string[]
}

interface ManagementCardProps {
  card: ManagementCard
}

function ManagementCardComponent({ card }: ManagementCardProps): JSX.Element {
  return (
    <Link
      href={card.href}
      className='group'
    >
      <Card className='h-full hover:shadow-lg hover:scale-105 hover:bg-accent transition-all duration-200 cursor-pointer px-6 py-10 border-2 hover:border-primary/20'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 p-0'>
          <CardTitle className='text-2xl font-bold'>{card.title}</CardTitle>
          <card.icon className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
      </Card>
    </Link>
  )
}

const managementCards: ManagementCard[] = [
  // Admin-only cards
  {
    id: 'room-info',
    title: 'Room Info',
    href: './admin/info',
    icon: Building2,
    roles: ['admin'],
  },
  {
    id: 'security',
    title: 'Security',
    href: './admin/security',
    icon: Shield,
    roles: ['admin'],
  },
  {
    id: 'reports',
    title: 'Reports',
    href: '#',
    icon: BarChart3,
    roles: ['admin'],
  },
  // Supervisor and Admin cards
  {
    id: 'games',
    title: 'Games',
    href: './admin/games',
    icon: Club,
    roles: ['admin', 'supervisor'],
  },
  {
    id: 'tables',
    title: 'Tables',
    href: './admin/tables',
    icon: Table,
    roles: ['admin', 'supervisor'],
  },
  {
    id: 'waitlists',
    title: 'Waitlists',
    href: './admin/waitlists',
    icon: Clock,
    roles: ['admin', 'supervisor'],
  },
  {
    id: 'players',
    title: 'Players',
    href: './admin/players',
    icon: Users,
    roles: ['admin', 'supervisor'],
  },
  {
    id: 'promos',
    title: 'Promos',
    href: './admin/promos',
    icon: Gift,
    roles: ['admin', 'supervisor'],
  },
  {
    id: 'tournaments',
    title: 'Tournaments',
    href: './admin/tournaments',
    icon: Trophy,
    roles: ['admin', 'supervisor'],
  },
]

export function AdminConsole(): JSX.Element {
  const [stats, setStats] = useState<ConsoleStats>({
    totalGames: 0,
    activeGames: 0,
    totalTables: 0,
    activeTables: 0,
    totalTournaments: 0,
    activeTournaments: 0,
    waitlistEntries: 0,
  })
  const [loading, setLoading] = useState(true)
  const operator = useOperator()

  useEffect(() => {
    const fetchStats = async (): Promise<void> => {
      try {
        // Use operator from context instead of making new requests
        if (!operator?.profile?.room_id) return

        const supabase = createClient()
        const roomId = operator.profile.room_id

        // Fetch stats for the operator's room
        const [gamesResult, tablesResult, tournamentsResult, waitlistResult] =
          await Promise.all([
            supabase
              .from('games')
              .select('id, is_active')
              .eq('room_id', roomId),
            supabase
              .from('tables')
              .select('id, is_active')
              .eq('room_id', roomId),
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
            tablesResult.data?.filter((t: TableData) => t.is_active === true)
              .length || 0,
          totalTournaments: tournamentsResult.data?.length || 0,
          activeTournaments:
            tournamentsResult.data?.filter(
              (t: TournamentData) => t.status === 'in_progress'
            ).length || 0,
          waitlistEntries: waitlistResult.data?.length || 0,
        })
      } catch (_error) {
        // Error fetching console stats - handled by error state
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [operator]) // Add operator as dependency, [])

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loading
          size='md'
          text='Loading console...'
        />
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>
          {operator?.profile?.role === 'supervisor'
            ? 'Supervisor Console'
            : 'Admin Console'}
        </h1>
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
            <CardTitle className='text-sm font-medium'>Waitlist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.waitlistEntries}</div>
            <p className='text-xs text-muted-foreground'>players waiting</p>
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
      </div>

      <div>
        <h2 className='text-2xl font-bold tracking-tight mb-4'>Manage</h2>
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {managementCards
            .filter((card) =>
              card.roles.includes(operator?.profile?.role || '')
            )
            .map((card) => (
              <ManagementCardComponent
                key={card.id}
                card={card}
              />
            ))}
        </div>
      </div>
    </div>
  )
}
