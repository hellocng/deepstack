import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/profile-form'
import { PlayerStats } from '@/components/player-stats'
import { RecentActivity } from '@/components/recent-activity'
import { Button } from '@/components/ui/button'
import { Settings, LogOut } from 'lucide-react'

interface ProfilePageProps {
  params: {
    tenant: string
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = await createClient()
  
  // Get tenant information
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('code', params.tenant)
    .eq('is_active', true)
    .single()

  if (!tenant) {
    return <div>Tenant not found</div>
  }

  // Get current user (this would come from auth in real implementation)
  // For now, we'll show a placeholder
  const currentUserId = 'current-user-id' // This would be from auth

  // Get player profile
  const { data: player, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', currentUserId)
    .single()

  if (error) {
    console.error('Error fetching player:', error)
    return <div>Error loading profile</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account and view your activity
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Form */}
        <div className="lg:col-span-2">
          <ProfileForm player={player} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Player Stats */}
          <PlayerStats playerId={currentUserId} tenantId={tenant.id} />
          
          {/* Recent Activity */}
          <RecentActivity playerId={currentUserId} tenantId={tenant.id} />
        </div>
      </div>
    </div>
  )
}
