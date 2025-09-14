import { createClient } from '@/lib/supabase/server'
import { FriendCard } from '@/components/friend-card'
import { AddFriendDialog } from '@/components/add-friend-dialog'
import { Button } from '@/components/ui/button'
import { Plus, Users } from 'lucide-react'

interface FriendsPageProps {
  params: Promise<{
    tenant: string
  }>
}

export default async function FriendsPage({
  params,
}: FriendsPageProps): Promise<JSX.Element> {
  const { tenant } = await params
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

  // Get friends for the current user
  const { data: friendships, error } = await supabase
    .from('friendships')
    .select(
      `
      *,
      players!friendships_player_id_fkey(
        id,
        alias,
        avatar_url,
        last_login
      ),
      players!friendships_friend_id_fkey(
        id,
        alias,
        avatar_url,
        last_login
      )
    `
    )
    .or(`player_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
    .eq('status', 'accepted')

  if (error) {
    // Error fetching friends
    return <div>Error loading friends</div>
  }

  // Process friendships to get friend data
  const friends =
    friendships
      ?.map((friendship) => {
        const friend =
          friendship.player_id === currentUserId
            ? friendship.players_friendships_friend_id_fkey
            : friendship.players_friendships_player_id_fkey

        return {
          ...friend,
          friendshipId: friendship.id,
          status: friendship.status,
        }
      })
      .filter(Boolean) || []

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Friends</h1>
          <p className='text-muted-foreground'>
            Connect with other players and see where they&apos;re playing
          </p>
        </div>
        <AddFriendDialog>
          <Button>
            <Plus className='h-4 w-4 mr-2' />
            Add Friend
          </Button>
        </AddFriendDialog>
      </div>

      {/* Friends Grid */}
      {friends.length > 0 ? (
        <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {friends.map((friend) => (
            <FriendCard
              key={friend.id}
              friend={friend}
              tenant={tenant}
            />
          ))}
        </div>
      ) : (
        <div className='text-center py-12'>
          <div className='text-muted-foreground mb-4'>
            <Users className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <h3 className='text-lg font-medium'>No friends yet</h3>
            <p>
              Add friends to see where they&apos;re playing and join them at
              tables.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
