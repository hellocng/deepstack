import { createClient } from '@/lib/supabase/server'
import { DashboardStats } from '@/components/dashboard-stats'
import { ActiveGames } from '@/components/active-games'
import { FriendActivity } from '@/components/friend-activity'
import { QuickActions } from '@/components/quick-actions'
import { Tables } from '@/types/supabase'

type Room = Tables<'rooms'>

interface RoomPageProps {
  params: Promise<{
    room: string
  }>
}

export default async function RoomPage({
  params,
}: RoomPageProps): Promise<JSX.Element> {
  const supabase = await createClient()
  const resolvedParams = await params

  // Get room information
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', resolvedParams.room)
    .eq('is_active', true)
    .single()

  if (error || !room) {
    return <div>Room not found</div>
  }

  // TypeScript assertion that room is not null after the check
  const roomData = room as Room

  return (
    <div className='space-y-6'>
      {/* Welcome Section */}
      <div className='text-center py-8'>
        <h1 className='text-3xl font-bold mb-2'>Welcome to {roomData.name}</h1>
        <p className='text-muted-foreground'>
          Find games, join waitlists, and connect with friends
        </p>
      </div>

      {/* Dashboard Stats */}
      <DashboardStats tenantId={roomData.id} />

      {/* Quick Actions */}
      <QuickActions room={roomData} />

      {/* Main Content Grid */}
      <div className='grid lg:grid-cols-2 gap-6'>
        {/* Active Games */}
        <ActiveGames tenantId={roomData.id} />

        {/* Friend Activity */}
        <FriendActivity />
      </div>
    </div>
  )
}
