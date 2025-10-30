import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const joinWaitlistSchema = z.object({
  gameIds: z
    .array(z.string().uuid())
    .min(1, 'At least one game must be selected'),
  notes: z.string().optional(),
  keepOtherEntries: z.boolean().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ room: string }> }
): Promise<NextResponse> {
  try {
    const { room: roomId } = await params
    const body = await request.json()

    // Validate request body
    const validation = joinWaitlistSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { gameIds, notes, keepOtherEntries = true } = validation.data

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

    // Verify room exists and is accessible
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, name')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Verify all games exist and are active
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('id, name, is_active')
      .eq('room_id', roomId)
      .in('id', gameIds)

    if (gamesError) {
      return NextResponse.json(
        { error: 'Failed to verify games' },
        { status: 500 }
      )
    }

    if (!games || games.length !== gameIds.length) {
      return NextResponse.json(
        { error: 'One or more games not found' },
        { status: 404 }
      )
    }

    const inactiveGames = games.filter((game) => !game.is_active)
    if (inactiveGames.length > 0) {
      return NextResponse.json(
        {
          error: 'One or more games are inactive',
          inactiveGames: inactiveGames.map((g) => g.name),
        },
        { status: 400 }
      )
    }

    // Check for existing entries if keepOtherEntries is false
    if (!keepOtherEntries) {
      const { data: existingEntries, error: existingError } = await supabase
        .from('waitlist_entries')
        .select('id, game_id')
        .eq('player_id', player.id)
        .in('status', ['waiting', 'calledin', 'notified'])

      if (existingError) {
        return NextResponse.json(
          { error: 'Failed to check existing entries' },
          { status: 500 }
        )
      }

      if (existingEntries && existingEntries.length > 0) {
        // Cancel existing entries
        const { error: cancelError } = await supabase
          .from('waitlist_entries')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_by: 'player',
            updated_at: new Date().toISOString(),
          })
          .in(
            'id',
            existingEntries.map((e) => e.id)
          )

        if (cancelError) {
          return NextResponse.json(
            { error: 'Failed to cancel existing entries' },
            { status: 500 }
          )
        }
      }
    }

    // Create separate waitlist entries for each game
    const entries = gameIds.map((gameId) => ({
      player_id: player.id,
      game_id: gameId,
      room_id: roomId,
      status: 'calledin' as const,
      notes: notes || null,
      entry_method: 'callin' as const,
    }))

    const { data: newEntries, error: insertError } = await supabase
      .from('waitlist_entries')
      .insert(entries).select(`
        id,
        game_id,
        status,
        created_at,
        notes,
        game:games(id, name, game_type, small_blind, big_blind)
      `)

    if (insertError) {
      console.error('Error creating waitlist entries:', insertError)
      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      entries: newEntries,
      message: `Successfully joined waitlist for ${newEntries?.length || 0} game(s)`,
    })
  } catch (error) {
    console.error('Error in join waitlist API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
