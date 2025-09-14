import { createClient } from '@/lib/supabase/server'
import { DashboardStats } from '@/components/dashboard-stats'
import { ActiveGames } from '@/components/active-games'
import { FriendActivity } from '@/components/friend-activity'
import { QuickActions } from '@/components/quick-actions'

interface TenantPageProps {
  params: {
    tenant: string
  }
}

export default async function TenantPage({ params }: TenantPageProps) {
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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to {tenant.name}</h1>
        <p className="text-muted-foreground">
          Find games, join waitlists, and connect with friends
        </p>
      </div>

      {/* Dashboard Stats */}
      <DashboardStats tenantId={tenant.id} />

      {/* Quick Actions */}
      <QuickActions tenant={tenant} />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Games */}
        <ActiveGames tenantId={tenant.id} />
        
        {/* Friend Activity */}
        <FriendActivity />
      </div>
    </div>
  )
}
