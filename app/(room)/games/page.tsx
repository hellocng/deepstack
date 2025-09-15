import { createClient } from '@/lib/supabase/server'
import { GameCard } from '@/components/game-card'
import { GameFilters } from '@/components/game-filters'
import { Button } from '@/components/ui/button'
import { Plus, Filter } from 'lucide-react'

interface GamesPageProps {
  params: {
    tenant: string
  }
  searchParams: {
    type?: string
    stakes?: string
  }
}

export default async function GamesPage({
  params,
  searchParams,
}: GamesPageProps): Promise<JSX.Element> {
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

  // Build query for games at this specific tenant only
  let query = supabase
    .from('games')
    .select(
      `
      *,
      tables(
        id,
        name,
        seat_count,
        status
      )
    `
    )
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)

  // Apply filters
  if (searchParams.type) {
    query = query.eq('game_type', searchParams.type)
  }

  const { data: games, error } = await query

  if (error) {
    // Error fetching games
    return <div>Error loading games</div>
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Available Games</h1>
          <p className='text-muted-foreground'>
            Find and join poker games at {tenant.name}
          </p>
        </div>
        <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            size='sm'
          >
            <Filter className='h-4 w-4 mr-2' />
            Filters
          </Button>
        </div>
      </div>

      {/* Game Filters */}
      <GameFilters />

      {/* Games Grid */}
      {games && games.length > 0 ? (
        <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              tenant={tenant}
            />
          ))}
        </div>
      ) : (
        <div className='text-center py-12'>
          <div className='text-muted-foreground mb-4'>
            <Plus className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <h3 className='text-lg font-medium'>No games available</h3>
            <p>
              Check back later for new games or contact the room for more
              information.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
