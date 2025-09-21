import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WaitlistPositionManager } from '@/lib/waitlist-position-manager'

export async function POST(
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

    // Move the waitlist entry down
    WaitlistPositionManager.setSupabaseClient(supabase)
    const success = await WaitlistPositionManager.moveDown(id)

    if (!success) {
      // Check if the entry exists first
      const { data: entry, error: entryError } = await supabase
        .from('waitlist_entries')
        .select('id')
        .eq('id', id)
        .single()

      if (entryError?.code === 'PGRST116' || !entry) {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      }

      return NextResponse.json(
        { error: 'Failed to move entry down' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error moving waitlist entry down:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
