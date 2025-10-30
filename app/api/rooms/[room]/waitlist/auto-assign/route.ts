import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WaitlistTableIntegration } from '@/lib/waitlist-table-integration'
import { z } from 'zod'

const autoAssignSchema = z.object({
  gameId: z.string().uuid(),
  assignedBy: z.string().min(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ room: string }> }
): Promise<NextResponse> {
  try {
    const { room: roomId } = await params
    const body = await request.json()

    // Validate request body
    const validation = autoAssignSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { gameId, assignedBy } = validation.data

    const supabase = await createClient()

    WaitlistTableIntegration.setSupabaseClient(supabase)

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

    // Auto-assign next player
    const result = await WaitlistTableIntegration.autoAssignNextPlayer(
      roomId,
      gameId,
      assignedBy
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to auto-assign player' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${result.assignedPlayer} to a table`,
      assignedPlayer: result.assignedPlayer,
    })
  } catch (error) {
    console.error('Error in auto-assign API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
