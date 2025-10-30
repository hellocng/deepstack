import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WaitlistStatusManager } from '@/lib/waitlist-status-manager'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum([
    'waiting',
    'calledin',
    'notified',
    'cancelled',
    'seated',
    'expired',
  ]),
  notes: z.string().optional(),
  cancelledBy: z.enum(['player', 'staff', 'system']).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ room: string; id: string }> }
): Promise<NextResponse> {
  try {
    const { room: roomId, id: entryId } = await params
    const body = await request.json()

    // Validate request body
    const validation = updateStatusSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { status, notes, cancelledBy } = validation.data

    const supabase = await createClient()

    WaitlistStatusManager.setSupabaseClient(supabase)

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an operator for this room
    const { data: operator, error: operatorError } = await supabase
      .from('operators')
      .select('room_id, role')
      .eq('auth_id', user.id)
      .eq('room_id', roomId)
      .single()

    if (operatorError || !operator) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update the status
    const result = await WaitlistStatusManager.updateStatus(
      entryId,
      status,
      'staff',
      { notes, cancelledBy }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update status' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Status updated to ${status}`,
    })
  } catch (error) {
    console.error('Error updating waitlist status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ room: string; id: string }> }
): Promise<NextResponse> {
  try {
    const { room: roomId, id: entryId } = await params

    const supabase = await createClient()

    WaitlistStatusManager.setSupabaseClient(supabase)

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the waitlist entry
    const entry = await WaitlistStatusManager.getEntry(entryId)

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    if (!entry.player_id) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Check if user has access to this entry
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('auth_id')
      .eq('id', entry.player_id)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Check if user is the player or an operator
    const isPlayer = player.auth_id === user.id
    const isOperator = await supabase
      .from('operators')
      .select('id')
      .eq('auth_id', user.id)
      .eq('room_id', roomId)
      .single()

    if (!isPlayer && isOperator.error) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      entry,
    })
  } catch (error) {
    console.error('Error getting waitlist entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
