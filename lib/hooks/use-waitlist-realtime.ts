import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type WaitlistEntry = Database['public']['Tables']['waitlist_entries']['Row'] & {
  player: {
    id: string
    alias: string | null
    avatar_url: string | null
    phone_number?: string | null
  } | null
  game: {
    id: string
    name: string
    game_type: string
    small_blind: number
    big_blind: number
  } | null
}

interface UseWaitlistRealtimeOptions {
  roomId: string
  onUpdate?: (entries: WaitlistEntry[]) => void
}

export function useWaitlistRealtime({
  roomId,
  onUpdate,
}: UseWaitlistRealtimeOptions): {
  entries: WaitlistEntry[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async (): Promise<void> => {
    if (!roomId) return

    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()

      const selectWithPhone = `
        *,
        player:players(id, alias, avatar_url, phone_number),
        game:games(id, name, game_type, small_blind, big_blind)
      `

      const selectFallback = `
        *,
        player:players(id, alias, avatar_url),
        game:games(id, name, game_type, small_blind, big_blind)
      `

      let data: WaitlistEntry[] | null
      let fetchError: unknown

      {
        const result = await supabase
          .from('waitlist_entries')
          .select(selectWithPhone)
          .eq('room_id', roomId)
          .in('status', ['waiting', 'calledin', 'notified'])
          .order('position', { ascending: true })
        data = (result.data as unknown as WaitlistEntry[]) || null
        fetchError = result.error
      }

      if (
        fetchError &&
        typeof fetchError === 'object' &&
        fetchError !== null &&
        'message' in fetchError &&
        String((fetchError as { message?: string }).message || '').includes(
          'phone_number'
        )
      ) {
        const fallback = await supabase
          .from('waitlist_entries')
          .select(selectFallback)
          .eq('room_id', roomId)
          .in('status', ['waiting', 'calledin', 'notified'])
          .order('position', { ascending: true })

        data = (fallback.data as unknown as WaitlistEntry[]) || null
        fetchError = fallback.error
      }

      if (fetchError) {
        throw fetchError
      }

      setEntries(data || [])
      onUpdate?.(data || [])
    } catch (err) {
      console.error('Error fetching waitlist entries:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch entries')
    } finally {
      setLoading(false)
    }
  }, [roomId, onUpdate])

  useEffect(() => {
    fetchEntries()

    // Set up real-time subscription
    const supabase = createClient()

    const subscription = supabase
      .channel(`waitlist-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waitlist_entries',
          filter: `room_id=eq.${roomId}`,
        },
        (_payload) => {
          // Refetch entries when any change occurs
          fetchEntries()
        }
      )
      .subscribe()

    return (): void => {
      subscription.unsubscribe()
    }
  }, [roomId, fetchEntries])

  return {
    entries,
    loading,
    error,
    refetch: fetchEntries,
  }
}
