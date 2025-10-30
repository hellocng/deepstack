import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WaitlistExpirySystem } from '@/lib/waitlist-expiry-system'
import { WaitlistStatusManager } from '@/lib/waitlist-status-manager'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ room: string }> }
): Promise<NextResponse> {
  try {
    const { room: roomId } = await params

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

    // Process expiry warnings
    await WaitlistStatusManager.processExpiryWarnings(roomId)

    // Check and expire entries
    await WaitlistExpirySystem.checkAndExpireEntries(roomId)

    return NextResponse.json({
      success: true,
      message: 'Expiry processing completed',
    })
  } catch (error) {
    console.error('Error processing waitlist expiry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
