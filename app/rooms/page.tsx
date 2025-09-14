import { createClient } from '@/lib/supabase/server'
import { RoomCard } from '@/components/room-card'
import { MapPin } from 'lucide-react'

export default async function RoomsPage() {
  const supabase = await createClient()

  // Get all active tenants (poker rooms)
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select(
      `
      id,
      name,
      code,
      description,
      logo_url,
      website_url,
      contact_email,
      address,
      phone,
      is_active,
      created_at,
      updated_at,
      games(
        id,
        name,
        game_type,
        small_blind,
        big_blind,
        is_active
      ),
      tables(
        id,
        name,
        seat_count,
        status
      )
    `
    )
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching tenants:', error)
    return <div>Error loading rooms</div>
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold'>Poker Rooms</h1>
        <p className='text-muted-foreground'>
          Find poker rooms and see current game availability
        </p>
      </div>

      {/* Rooms Grid */}
      {tenants && tenants.length > 0 ? (
        <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {tenants.map((tenant) => (
            <RoomCard
              key={tenant.id}
              tenant={tenant}
            />
          ))}
        </div>
      ) : (
        <div className='text-center py-12'>
          <div className='text-muted-foreground mb-4'>
            <MapPin className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <h3 className='text-lg font-medium'>No poker rooms available</h3>
            <p>Check back later for new poker rooms in your area.</p>
          </div>
        </div>
      )}
    </div>
  )
}
