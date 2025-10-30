import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ room: string }> }
): Promise<NextResponse> {
  try {
    const { room: roomId } = await params

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

    // Get player's waitlist entries
    const { data: entries, error: entriesError } = await supabase
      .from('waitlist_entries')
      .select(
        `
        id,
        status,
        position,
        created_at,
        checked_in_at,
        notified_at,
        cancelled_at,
        notes,
        game:games(id, name, game_type, small_blind, big_blind)
      `
      )
      .eq('player_id', player.id)
      .eq('room_id', roomId)
      .in('status', ['waiting', 'calledin', 'notified'])
      .order('position', { ascending: true })

    if (entriesError) {
      console.error('Error fetching waitlist entries:', entriesError)
      return NextResponse.json(
        { error: 'Failed to fetch waitlist status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      entries: entries || [],
    })
  } catch (error) {
    console.error('Error in waitlist status API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
