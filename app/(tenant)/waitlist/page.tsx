import { createClient } from '@/lib/supabase/server'
import { WaitlistCard } from '@/components/waitlist-card'
import { Button } from '@/components/ui/button'
import { Plus, Clock } from 'lucide-react'

interface WaitlistPageProps {
  params: {
    tenant: string
  }
}

export default async function WaitlistPage({
  params,
}: WaitlistPageProps): Promise<JSX.Element> {
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

  // Get waitlist entries for this tenant only
  const { data: waitlistEntries, error } = await supabase
    .from('waitlist_entries')
    .select(
      `
      *,
      games(
        id,
        name,
        game_type,
        small_blind,
        big_blind
      ),
      players(
        id,
        alias,
        avatar_url
      )
    `
    )
    .eq('tenant_id', tenant.id)
    .eq('status', 'waiting')
    .order('position', { ascending: true })

  if (error) {
    // Error fetching waitlist
    return <div>Error loading waitlist</div>
  }

  // Group waitlist entries by game
  const waitlistByGame = waitlistEntries?.reduce(
    (acc, entry) => {
      const gameId = entry.games?.id
      if (!gameId) return acc

      if (!acc[gameId]) {
        acc[gameId] = {
          game: entry.games,
          entries: [],
        }
      }
      acc[gameId].entries.push(entry)
      return acc
    },
    {} as Record<
      string,
      { game: typeof entry.games; entries: typeof waitlistEntries }
    >
  )

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Waitlists</h1>
          <p className='text-muted-foreground'>
            Current waitlist status at {tenant.name}
          </p>
        </div>
        <Button>
          <Plus className='h-4 w-4 mr-2' />
          Join Waitlist
        </Button>
      </div>

      {/* Waitlist by Game */}
      {waitlistByGame && Object.keys(waitlistByGame).length > 0 ? (
        <div className='space-y-6'>
          {Object.entries(waitlistByGame).map(([gameId, { game, entries }]) => (
            <WaitlistCard
              key={gameId}
              game={game}
              entries={entries}
              tenant={tenant}
            />
          ))}
        </div>
      ) : (
        <div className='text-center py-12'>
          <div className='text-muted-foreground mb-4'>
            <Clock className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <h3 className='text-lg font-medium'>No active waitlists</h3>
            <p>No players are currently waiting for games at this location.</p>
          </div>
        </div>
      )}
    </div>
  )
}
