import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

type WaitlistEntry = Database['public']['Tables']['waitlist_entries']['Row']

/**
 * Utility class for managing waitlist positions using fractional indexing.
 * This allows for arbitrary reordering without cascading updates.
 */
export class WaitlistPositionManager {
  private static supabase: SupabaseClient<Database> | null = null

  private static getSupabase(): SupabaseClient<Database> {
    if (!this.supabase) {
      throw new Error(
        'Supabase client not initialized. Call setSupabaseClient() first.'
      )
    }
    return this.supabase
  }

  static setSupabaseClient(client: SupabaseClient<Database>): void {
    this.supabase = client
  }

  /**
   * Insert a new waitlist entry at a specific position
   */
  static async insertAtPosition(
    gameId: string,
    playerId: string,
    roomId: string,
    targetPosition: number,
    notes?: string
  ): Promise<WaitlistEntry | null> {
    try {
      // Get entries around target position
      const { data: neighbors, error: neighborsError } =
        await this.getSupabase()
          .from('waitlist_entries')
          .select('position')
          .eq('game_id', gameId)
          .eq('status', 'waiting')
          .order('position')
          .range(targetPosition - 1, targetPosition)

      if (neighborsError) {
        console.error('Error fetching neighbors:', neighborsError)
        return null
      }

      let newPosition: number

      if (neighbors.length === 0) {
        // First entry
        newPosition = 1
      } else if (neighbors.length === 1) {
        // Insert at end
        newPosition = (neighbors[0].position || 0) + 1
      } else {
        // Insert between two entries
        const prevPos = neighbors[0].position || 0
        const nextPos = neighbors[1].position || 0
        newPosition = (prevPos + nextPos) / 2
      }

      // Insert new entry
      const { data: newEntry, error: insertError } = await this.getSupabase()
        .from('waitlist_entries')
        .insert({
          game_id: gameId,
          player_id: playerId,
          room_id: roomId,
          position: newPosition,
          status: 'waiting',
          notes: notes || null,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting waitlist entry:', insertError)
        return null
      }

      return newEntry
    } catch (error) {
      console.error('Error in insertAtPosition:', error)
      return null
    }
  }

  /**
   * Move an entry up by one position
   */
  static async moveUp(entryId: string): Promise<boolean> {
    try {
      const { data: currentEntry, error: currentError } =
        await this.getSupabase()
          .from('waitlist_entries')
          .select('game_id, position')
          .eq('id', entryId)
          .single()

      if (currentError || !currentEntry) {
        console.error('Error fetching current entry:', currentError)
        if (currentError?.code === 'PGRST116') {
          console.warn('Entry not found, cannot move up')
        }
        return false
      }

      if (!currentEntry.game_id) {
        console.warn('Entry has no game_id, cannot move up')
        return false
      }

      // Get entry above (the one we want to move above)
      const { data: entryAbove, error: aboveError } = await this.getSupabase()
        .from('waitlist_entries')
        .select('position')
        .eq('game_id', currentEntry.game_id)
        .eq('status', 'waiting')
        .lt('position', currentEntry.position || 0)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Get entry two positions above (to place between this and entryAbove)
      const { data: entryTwoAbove, error: _twoAboveError } =
        await this.getSupabase()
          .from('waitlist_entries')
          .select('position')
          .eq('game_id', currentEntry.game_id)
          .eq('status', 'waiting')
          .lt('position', entryAbove?.position || currentEntry.position || 0)
          .order('position', { ascending: false })
          .limit(1)
          .maybeSingle()

      if (aboveError || !entryAbove) {
        // Already at top
        return false
      }

      // Calculate new position
      let newPosition: number

      if (entryTwoAbove) {
        // Place between entryTwoAbove and entryAbove
        newPosition =
          ((entryTwoAbove.position || 0) + (entryAbove.position || 0)) / 2
      } else {
        // Place before entryAbove (at the top)
        newPosition = (entryAbove.position || 0) / 2
      }

      // Check if positions are too close (precision issue)
      const gap = (currentEntry.position || 0) - (entryAbove.position || 0)
      if (gap < 0.001) {
        // Rebalance all positions for this game
        await this.rebalancePositions(currentEntry.game_id)
        // Recalculate after rebalancing
        const { data: updatedEntryAbove } = await this.getSupabase()
          .from('waitlist_entries')
          .select('position')
          .eq('game_id', currentEntry.game_id)
          .eq('status', 'waiting')
          .lt('position', currentEntry.position || 0)
          .order('position', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (updatedEntryAbove) {
          newPosition =
            ((updatedEntryAbove.position || 0) + (currentEntry.position || 0)) /
            2
        }
      }

      // Ensure the new position is actually smaller than current position
      if (newPosition >= (currentEntry.position || 0)) {
        return false
      }

      const { error: updateError } = await this.getSupabase()
        .from('waitlist_entries')
        .update({
          position: newPosition,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId)

      if (updateError) {
        console.error('Error updating position:', updateError)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in moveUp:', error)
      return false
    }
  }

  /**
   * Move an entry down by one position
   */
  static async moveDown(entryId: string): Promise<boolean> {
    try {
      const { data: currentEntry, error: currentError } =
        await this.getSupabase()
          .from('waitlist_entries')
          .select('game_id, position')
          .eq('id', entryId)
          .single()

      if (currentError || !currentEntry) {
        console.error('Error fetching current entry:', currentError)
        if (currentError?.code === 'PGRST116') {
          console.warn('Entry not found, cannot move down')
        }
        return false
      }

      if (!currentEntry.game_id) {
        console.warn('Entry has no game_id, cannot move down')
        return false
      }

      // Get entry below (the one we want to move below)
      const { data: entryBelow, error: belowError } = await this.getSupabase()
        .from('waitlist_entries')
        .select('position')
        .eq('game_id', currentEntry.game_id)
        .eq('status', 'waiting')
        .gt('position', currentEntry.position || 0)
        .order('position')
        .limit(1)
        .maybeSingle()

      // Get entry two positions below (to place between this and entryBelow)
      const { data: entryTwoBelow, error: _twoBelowError } =
        await this.getSupabase()
          .from('waitlist_entries')
          .select('position')
          .eq('game_id', currentEntry.game_id)
          .eq('status', 'waiting')
          .gt('position', entryBelow?.position || currentEntry.position || 0)
          .order('position')
          .limit(1)
          .maybeSingle()

      if (belowError || !entryBelow) {
        // Already at bottom
        return false
      }

      // Calculate new position
      let newPosition: number

      if (entryTwoBelow) {
        // Place between entryBelow and entryTwoBelow
        newPosition =
          ((entryBelow.position || 0) + (entryTwoBelow.position || 0)) / 2
      } else {
        // Place after entryBelow (at the bottom)
        newPosition = (entryBelow.position || 0) + 1
      }

      // Check if positions are too close (precision issue)
      const gap = (entryBelow.position || 0) - (currentEntry.position || 0)
      if (gap < 0.001) {
        // Rebalance all positions for this game
        await this.rebalancePositions(currentEntry.game_id)
        // Recalculate after rebalancing
        const { data: updatedEntryBelow } = await this.getSupabase()
          .from('waitlist_entries')
          .select('position')
          .eq('game_id', currentEntry.game_id)
          .eq('status', 'waiting')
          .gt('position', currentEntry.position || 0)
          .order('position')
          .limit(1)
          .maybeSingle()

        if (updatedEntryBelow) {
          newPosition = (updatedEntryBelow.position || 0) + 1
        }
      }

      // Ensure the new position is actually larger than current position
      if (newPosition <= (currentEntry.position || 0)) {
        return false
      }

      const { error: updateError } = await this.getSupabase()
        .from('waitlist_entries')
        .update({
          position: newPosition,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId)

      if (updateError) {
        console.error('Error updating position:', updateError)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in moveDown:', error)
      return false
    }
  }

  /**
   * Move an entry to the top of the waitlist
   */
  static async moveToTop(entryId: string): Promise<boolean> {
    try {
      const { data: currentEntry, error: currentError } =
        await this.getSupabase()
          .from('waitlist_entries')
          .select('game_id, position')
          .eq('id', entryId)
          .single()

      if (currentError || !currentEntry) {
        console.error('Error fetching current entry:', currentError)
        if (currentError?.code === 'PGRST116') {
          console.warn('Entry not found, cannot move to top')
        }
        return false
      }

      if (!currentEntry.game_id) {
        console.warn('Entry has no game_id, cannot move to top')
        return false
      }

      // Get the current top entry
      const { data: topEntry, error: topError } = await this.getSupabase()
        .from('waitlist_entries')
        .select('position')
        .eq('game_id', currentEntry.game_id)
        .eq('status', 'waiting')
        .neq('id', entryId)
        .order('position')
        .limit(1)
        .maybeSingle()

      let newPosition: number

      if (topError || !topEntry) {
        // No other entries, position 1
        newPosition = 1
      } else {
        // Position before the current top
        newPosition = (topEntry.position || 1) / 2
      }

      const { error: updateError } = await this.getSupabase()
        .from('waitlist_entries')
        .update({
          position: newPosition,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId)

      if (updateError) {
        console.error('Error updating position:', updateError)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in moveToTop:', error)
      return false
    }
  }

  /**
   * Move an entry to the bottom of the waitlist
   */
  static async moveToBottom(entryId: string): Promise<boolean> {
    try {
      const { data: currentEntry, error: currentError } =
        await this.getSupabase()
          .from('waitlist_entries')
          .select('game_id, position')
          .eq('id', entryId)
          .single()

      if (currentError || !currentEntry) {
        console.error('Error fetching current entry:', currentError)
        if (currentError?.code === 'PGRST116') {
          console.warn('Entry not found, cannot move to bottom')
        }
        return false
      }

      if (!currentEntry.game_id) {
        console.warn('Entry has no game_id, cannot move to bottom')
        return false
      }

      // Get the current bottom entry
      const { data: bottomEntry, error: bottomError } = await this.getSupabase()
        .from('waitlist_entries')
        .select('position')
        .eq('game_id', currentEntry.game_id)
        .eq('status', 'waiting')
        .neq('id', entryId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()

      let newPosition: number

      if (bottomError || !bottomEntry) {
        // No other entries, position 1
        newPosition = 1
      } else {
        // Position after the current bottom
        newPosition = (bottomEntry.position || 0) + 1
      }

      const { error: updateError } = await this.getSupabase()
        .from('waitlist_entries')
        .update({
          position: newPosition,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId)

      if (updateError) {
        console.error('Error updating position:', updateError)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in moveToBottom:', error)
      return false
    }
  }

  /**
   * Rebalance positions for a game to prevent precision issues
   */
  static async rebalancePositions(gameId: string): Promise<boolean> {
    try {
      // Get all entries for this game ordered by current position
      const { data: entries, error: entriesError } = await this.getSupabase()
        .from('waitlist_entries')
        .select('id, position')
        .eq('game_id', gameId)
        .eq('status', 'waiting')
        .order('position', { ascending: true })

      if (entriesError || !entries || entries.length === 0) {
        console.error('Error fetching entries for rebalancing:', entriesError)
        return false
      }

      // Assign new positions with gaps of 1
      const updates = entries.map((entry, index) => ({
        id: entry.id,
        position: (index + 1) * 1.0, // 1, 2, 3, 4, etc.
      }))

      // Update all positions
      for (const update of updates) {
        const { error: updateError } = await this.getSupabase()
          .from('waitlist_entries')
          .update({ position: update.position })
          .eq('id', update.id)

        if (updateError) {
          console.error(
            'Error updating position during rebalancing:',
            updateError
          )
          return false
        }
      }

      return true
    } catch (error) {
      console.error('Error in rebalancePositions:', error)
      return false
    }
  }

  /**
   * Get the current position of an entry within its game's waitlist
   */
  static async getPosition(entryId: string): Promise<number | null> {
    try {
      const { data: entry, error: entryError } = await this.getSupabase()
        .from('waitlist_entries')
        .select('game_id, position')
        .eq('id', entryId)
        .single()

      if (entryError || !entry) {
        console.error('Error fetching entry:', entryError)
        if (entryError?.code === 'PGRST116') {
          console.warn('Entry not found, cannot get position')
        }
        return null
      }

      if (!entry.game_id) {
        console.warn('Entry has no game_id, cannot get position')
        return null
      }

      // Count entries with lower position
      const { count, error: countError } = await this.getSupabase()
        .from('waitlist_entries')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', entry.game_id)
        .eq('status', 'waiting')
        .lt('position', entry.position || 0)

      if (countError) {
        console.error('Error counting entries:', countError)
        return null
      }

      return (count || 0) + 1
    } catch (error) {
      console.error('Error in getPosition:', error)
      return null
    }
  }

  /**
   * Check if an entry can be moved up
   */
  static async canMoveUp(entryId: string): Promise<boolean> {
    try {
      const { data: currentEntry, error: currentError } =
        await this.getSupabase()
          .from('waitlist_entries')
          .select('game_id, position')
          .eq('id', entryId)
          .single()

      if (currentError || !currentEntry) {
        return false
      }

      if (!currentEntry.game_id) {
        return false
      }

      // Check if there's an entry above
      const { data: entryAbove, error: aboveError } = await this.getSupabase()
        .from('waitlist_entries')
        .select('id')
        .eq('game_id', currentEntry.game_id)
        .eq('status', 'waiting')
        .lt('position', currentEntry.position || 0)
        .limit(1)
        .maybeSingle()

      return !aboveError && !!entryAbove
    } catch (error) {
      console.error('Error in canMoveUp:', error)
      return false
    }
  }

  /**
   * Check if an entry can be moved down
   */
  static async canMoveDown(entryId: string): Promise<boolean> {
    try {
      const { data: currentEntry, error: currentError } =
        await this.getSupabase()
          .from('waitlist_entries')
          .select('game_id, position')
          .eq('id', entryId)
          .single()

      if (currentError || !currentEntry) {
        return false
      }

      if (!currentEntry.game_id) {
        return false
      }

      // Check if there's an entry below
      const { data: entryBelow, error: belowError } = await this.getSupabase()
        .from('waitlist_entries')
        .select('id')
        .eq('game_id', currentEntry.game_id)
        .eq('status', 'waiting')
        .gt('position', currentEntry.position || 0)
        .limit(1)
        .maybeSingle()

      return !belowError && !!entryBelow
    } catch (error) {
      console.error('Error in canMoveDown:', error)
      return false
    }
  }

  /**
   * Add a new entry to the end of the waitlist (default behavior)
   */
  static async addToEnd(
    gameId: string,
    playerId: string,
    roomId: string,
    notes?: string
  ): Promise<WaitlistEntry | null> {
    try {
      // Get the last entry's position
      const { data: lastEntry, error: lastError } = await this.getSupabase()
        .from('waitlist_entries')
        .select('position')
        .eq('game_id', gameId)
        .eq('status', 'waiting')
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()

      let newPosition: number

      if (lastError || !lastEntry) {
        // First entry
        newPosition = 1
      } else {
        // After the last entry - use fractional indexing
        newPosition = (lastEntry.position || 0) + 1
      }

      // Insert new entry
      const { data: newEntry, error: insertError } = await this.getSupabase()
        .from('waitlist_entries')
        .insert({
          game_id: gameId,
          player_id: playerId,
          room_id: roomId,
          position: newPosition,
          status: 'waiting',
          notes: notes || null,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting waitlist entry:', insertError)
        return null
      }

      return newEntry
    } catch (error) {
      console.error('Error in addToEnd:', error)
      return null
    }
  }
}
