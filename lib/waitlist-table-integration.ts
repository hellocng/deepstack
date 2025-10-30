import { createClient } from '@/lib/supabase/client'
import { WaitlistStatusManager } from './waitlist-status-manager'
import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

//

export class WaitlistTableIntegration {
  private static supabase: SupabaseClient<Database> | null = null

  private static getSupabase(): SupabaseClient<Database> {
    if (!this.supabase) {
      this.supabase = createClient()
    }
    return this.supabase
  }

  static setSupabaseClient(client: SupabaseClient<Database>): void {
    this.supabase = client
    WaitlistStatusManager.setSupabaseClient(client)
  }

  /**
   * Get available seats for a specific table
   */
  static async getAvailableSeats(tableId: string): Promise<number[]> {
    try {
      const supabase = this.getSupabase()

      // Get table details
      const { data: table, error: tableError } = await supabase
        .from('tables')
        .select('seat_count')
        .eq('id', tableId)
        .single()

      if (tableError || !table) {
        console.error('Error fetching table:', tableError)
        return []
      }

      // Find active table session for this table
      const { data: tableSession, error: sessionFetchError } = await supabase
        .from('table_sessions')
        .select('id')
        .eq('table_id', tableId)
        .is('end_time', null)
        .single()

      if (sessionFetchError || !tableSession) {
        // No active session → no occupied seats
        return Array.from({ length: table.seat_count }, (_, i) => i + 1)
      }

      // Get occupied seats for the active table session
      const { data: occupiedSessions, error: sessionsError } = await supabase
        .from('player_sessions')
        .select('seat_number')
        .eq('table_session_id', tableSession.id)
        .is('end_time', null)

      if (sessionsError) {
        console.error('Error fetching occupied seats:', sessionsError)
        return []
      }

      const occupiedSeats = new Set(
        (occupiedSessions || []).map((session) => session.seat_number)
      )

      // Return available seats
      return Array.from({ length: table.seat_count }, (_, i) => i + 1).filter(
        (seat) => !occupiedSeats.has(seat)
      )
    } catch (error) {
      console.error('Error getting available seats:', error)
      return []
    }
  }

  /**
   * Check if a seat is available
   */
  static async isSeatAvailable(
    tableId: string,
    seatNumber: number
  ): Promise<boolean> {
    try {
      const supabase = this.getSupabase()

      // Resolve active table session
      const { data: tableSession, error: sessionFetchError } = await supabase
        .from('table_sessions')
        .select('id')
        .eq('table_id', tableId)
        .is('end_time', null)
        .single()

      if (sessionFetchError || !tableSession) {
        return false
      }

      const { data: _existingSession, error } = await supabase
        .from('player_sessions')
        .select('id')
        .eq('table_session_id', tableSession.id)
        .eq('seat_number', seatNumber)
        .is('end_time', null)
        .single()

      // If no session found, seat is available
      return error?.code === 'PGRST116'
    } catch (error) {
      console.error('Error checking seat availability:', error)
      return false
    }
  }

  /**
   * Assign player from waitlist to table
   */
  static async assignPlayerToTable(
    entryId: string,
    tableId: string,
    seatNumber: number,
    assignedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = this.getSupabase()

      // Get waitlist entry
      const entry = await WaitlistStatusManager.getEntry(entryId)
      if (!entry) {
        return { success: false, error: 'Waitlist entry not found' }
      }

      // Verify seat is available
      const isAvailable = await this.isSeatAvailable(tableId, seatNumber)
      if (!isAvailable) {
        return { success: false, error: 'Seat is not available' }
      }

      // Start transaction
      // Resolve active table session
      const { data: tableSession, error: sessionFetchError } = await supabase
        .from('table_sessions')
        .select('id')
        .eq('table_id', tableId)
        .is('end_time', null)
        .single()

      if (sessionFetchError || !tableSession) {
        return { success: false, error: 'No active table session' }
      }

      const { error: sessionError } = await supabase
        .from('player_sessions')
        .insert({
          table_session_id: tableSession.id,
          seat_number: seatNumber,
          player_id: entry.player_id,
          start_time: new Date().toISOString(),
        })

      if (sessionError) {
        console.error('Error creating player session:', sessionError)
        return { success: false, error: 'Failed to create player session' }
      }

      // Update waitlist entry status
      const result = await WaitlistStatusManager.seatPlayer(
        entryId,
        tableId,
        seatNumber,
        `Assigned by ${assignedBy}`
      )

      if (!result.success) {
        // Rollback: remove the player session
        if (entry.player_id) {
          await supabase
            .from('player_sessions')
            .delete()
            .eq('table_session_id', tableSession.id)
            .eq('seat_number', seatNumber)
            .eq('player_id', entry.player_id)
            .is('end_time', null)
        }

        return result
      }

      return { success: true }
    } catch (error) {
      console.error('Error assigning player to table:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Remove player from table and optionally add back to waitlist
   */
  static async removePlayerFromTable(
    sessionId: string,
    addToWaitlist: boolean = false,
    gameId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = this.getSupabase()

      // Get player session details
      const { data: session, error: sessionError } = await supabase
        .from('player_sessions')
        .select(
          `
          *,
          table:tables(id, name, game_id),
          player:players(id, alias)
        `
        )
        .eq('id', sessionId)
        .single()

      if (sessionError || !session) {
        return { success: false, error: 'Player session not found' }
      }

      // End the player session
      const { error: endSessionError } = await supabase
        .from('player_sessions')
        .update({
          end_time: new Date().toISOString(),
        })
        .eq('id', sessionId)

      if (endSessionError) {
        console.error('Error ending player session:', endSessionError)
        return { success: false, error: 'Failed to remove player from table' }
      }

      // Add player back to waitlist if requested
      if (addToWaitlist && gameId) {
        const { error: waitlistError } = await supabase
          .from('waitlist_entries')
          .insert({
            player_id: session.player_id,
            game_id: gameId,
            status: 'waiting',
            entry_method: 'inperson',
            check_in_immediately: true,
          })

        if (waitlistError) {
          console.error('Error adding player back to waitlist:', waitlistError)
          // Don't fail the entire operation for this
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error removing player from table:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Get table occupancy information
   */
  static async getTableOccupancy(tableId: string): Promise<{
    totalSeats: number
    occupiedSeats: number
    availableSeats: number
    players: Array<{
      id: string
      alias: string | null
      seatNumber: number
      startTime: string | null
    }>
  } | null> {
    try {
      const supabase = this.getSupabase()

      // Get table details
      const { data: table, error: tableError } = await supabase
        .from('tables')
        .select('seat_count')
        .eq('id', tableId)
        .single()

      if (tableError || !table) {
        console.error('Error fetching table:', tableError)
        return null
      }

      // Get current players
      // Resolve active table session
      const { data: tableSession, error: sessionFetchError } = await supabase
        .from('table_sessions')
        .select('id')
        .eq('table_id', tableId)
        .is('end_time', null)
        .single()

      if (sessionFetchError || !tableSession) {
        return {
          totalSeats: table.seat_count,
          occupiedSeats: 0,
          availableSeats: table.seat_count,
          players: [],
        }
      }

      const { data: sessions, error: sessionsError } = await supabase
        .from('player_sessions')
        .select(
          `
          seat_number,
          start_time,
          player:players(id, alias)
        `
        )
        .eq('table_session_id', tableSession.id)
        .is('end_time', null)

      if (sessionsError) {
        console.error('Error fetching player sessions:', sessionsError)
        return null
      }

      const players = (sessions || []).map((session) => ({
        id: session.player?.id || '',
        alias: session.player?.alias || null,
        seatNumber: session.seat_number,
        startTime: session.start_time,
      }))

      return {
        totalSeats: table.seat_count,
        occupiedSeats: players.length,
        availableSeats: table.seat_count - players.length,
        players,
      }
    } catch (error) {
      console.error('Error getting table occupancy:', error)
      return null
    }
  }

  /**
   * Find next available seat for a specific game
   */
  static async findNextAvailableSeat(gameId: string): Promise<{
    tableId: string
    seatNumber: number
    tableName: string
  } | null> {
    try {
      const supabase = this.getSupabase()

      // Get tables for this game
      const { data: tables, error: tablesError } = await supabase
        .from('tables')
        .select('id, name, seat_count')
        .eq('game_id', gameId)
        .eq('is_active', true)

      if (tablesError || !tables) {
        console.error('Error fetching tables:', tablesError)
        return null
      }

      // Check each table for available seats
      for (const table of tables) {
        const availableSeats = await this.getAvailableSeats(table.id)
        if (availableSeats.length > 0) {
          return {
            tableId: table.id,
            seatNumber: availableSeats[0],
            tableName: table.name,
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error finding next available seat:', error)
      return null
    }
  }

  /**
   * Auto-assign next player from waitlist
   */
  static async autoAssignNextPlayer(
    roomId: string,
    gameId: string,
    assignedBy: string
  ): Promise<{ success: boolean; error?: string; assignedPlayer?: string }> {
    try {
      const supabase = this.getSupabase()

      // Find next available seat
      const availableSeat = await this.findNextAvailableSeat(gameId)
      if (!availableSeat) {
        return { success: false, error: 'No available seats for this game' }
      }

      // Get next player in waitlist for this game
      const { data: nextEntry, error: entryError } = await supabase
        .from('waitlist_entries')
        .select(
          `
          id,
          player_id,
          player:players(alias)
        `
        )
        .eq('room_id', roomId)
        .eq('game_id', gameId)
        .eq('status', 'waiting')
        .order('position', { ascending: true })
        .limit(1)
        .single()

      if (entryError || !nextEntry) {
        return { success: false, error: 'No players waiting for this game' }
      }

      // Assign the player
      const result = await this.assignPlayerToTable(
        nextEntry.id,
        availableSeat.tableId,
        availableSeat.seatNumber,
        assignedBy
      )

      if (!result.success) {
        return result
      }

      return {
        success: true,
        assignedPlayer: nextEntry.player?.alias || 'Unknown Player',
      }
    } catch (error) {
      console.error('Error auto-assigning next player:', error)
      return { success: false, error: 'Internal server error' }
    }
  }
}
