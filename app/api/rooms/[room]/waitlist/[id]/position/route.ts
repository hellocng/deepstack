import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WaitlistPositionManager } from '@/lib/waitlist-position-manager'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ room: string; id: string }> }
): Promise<NextResponse> {
  try {
    const { room, id } = await params
    const supabase = await createClient()

    // Verify user is authenticated and has operator access
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
      .eq('room_id', room)
      .single()

    if (operatorError || !operator) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the position of the waitlist entry
    WaitlistPositionManager.setSupabaseClient(supabase)
    const position = await WaitlistPositionManager.getPosition(id)

    if (position === null) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    return NextResponse.json({ position })
  } catch (error) {
    console.error('Error getting waitlist entry position:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
