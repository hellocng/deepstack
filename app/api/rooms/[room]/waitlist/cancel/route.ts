import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const cancelWaitlistSchema = z.object({
  entryId: z.string().uuid(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ room: string }> }
): Promise<NextResponse> {
  try {
    const { room: roomId } = await params
    const body = await request.json()

    // Validate request body
    const validation = cancelWaitlistSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { entryId } = validation.data

    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get player record
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (playerError || !player) {
      return NextResponse.json(
        { error: 'Player profile not found' },
        { status: 404 }
      )
    }

    // Verify the entry exists and belongs to the player
    const { data: entry, error: entryError } = await supabase
      .from('waitlist_entries')
      .select('id, player_id, room_id, status, game:games(name)')
      .eq('id', entryId)
      .eq('player_id', player.id)
      .eq('room_id', roomId)
      .single()

    if (entryError || !entry) {
      return NextResponse.json(
        { error: 'Waitlist entry not found' },
        { status: 404 }
      )
    }

    // Check if entry can be cancelled
    if (entry.status === 'cancelled' || entry.status === 'seated') {
      return NextResponse.json(
        { error: 'Entry cannot be cancelled in current status' },
        { status: 400 }
      )
    }

    // Cancel the entry
    const { error: cancelError } = await supabase
      .from('waitlist_entries')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'player',
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryId)

    if (cancelError) {
      console.error('Error cancelling waitlist entry:', cancelError)
      return NextResponse.json(
        { error: 'Failed to cancel waitlist entry' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully cancelled waitlist entry for ${entry.game?.name || 'game'}`,
    })
  } catch (error) {
    console.error('Error in cancel waitlist API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
