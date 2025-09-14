// Generated Supabase types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      friendships: {
        Row: {
          created_at: string | null
          friend_id: string | null
          id: string
          player_id: string | null
          status: Database['public']['Enums']['friendship_status'] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          friend_id?: string | null
          id?: string
          player_id?: string | null
          status?: Database['public']['Enums']['friendship_status'] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          friend_id?: string | null
          id?: string
          player_id?: string | null
          status?: Database['public']['Enums']['friendship_status'] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'friendships_friend_id_fkey'
            columns: ['friend_id']
            isOneToOne: false
            referencedRelation: 'players'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'friendships_player_id_fkey'
            columns: ['player_id']
            isOneToOne: false
            referencedRelation: 'players'
            referencedColumns: ['id']
          },
        ]
      }
      games: {
        Row: {
          big_blind: number
          created_at: string | null
          description: string | null
          game_type: Database['public']['Enums']['game_type']
          id: string
          is_active: boolean | null
          max_buy_in: number
          max_players: number
          min_buy_in: number
          name: string
          rake: string | null
          small_blind: number
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          big_blind: number
          created_at?: string | null
          description?: string | null
          game_type: Database['public']['Enums']['game_type']
          id?: string
          is_active?: boolean | null
          max_buy_in: number
          max_players: number
          min_buy_in: number
          name: string
          rake?: string | null
          small_blind: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          big_blind?: number
          created_at?: string | null
          description?: string | null
          game_type?: Database['public']['Enums']['game_type']
          id?: string
          is_active?: boolean | null
          max_buy_in?: number
          max_players?: number
          min_buy_in?: number
          name?: string
          rake?: string | null
          small_blind?: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'games_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      operators: {
        Row: {
          auth_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean | null
          last_login: string | null
          last_name: string
          phone_number: string | null
          role: Database['public']['Enums']['operator_role']
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_name: string
          phone_number?: string | null
          role: Database['public']['Enums']['operator_role']
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string
          phone_number?: string | null
          role?: Database['public']['Enums']['operator_role']
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'operators_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      players: {
        Row: {
          alias: string
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          phone_number: string
          updated_at: string | null
        }
        Insert: {
          alias: string
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          phone_number: string
          updated_at?: string | null
        }
        Update: {
          alias?: string
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          phone_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      table_seats: {
        Row: {
          created_at: string | null
          id: string
          is_occupied: boolean | null
          player_id: string | null
          seat_number: number
          table_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_occupied?: boolean | null
          player_id?: string | null
          seat_number: number
          table_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_occupied?: boolean | null
          player_id?: string | null
          seat_number?: number
          table_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'table_seats_player_id_fkey'
            columns: ['player_id']
            isOneToOne: false
            referencedRelation: 'players'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'table_seats_table_id_fkey'
            columns: ['table_id']
            isOneToOne: false
            referencedRelation: 'tables'
            referencedColumns: ['id']
          },
        ]
      }
      tables: {
        Row: {
          created_at: string | null
          current_players: number | null
          game_id: string | null
          id: string
          name: string
          seat_count: number
          status: Database['public']['Enums']['table_status'] | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_players?: number | null
          game_id?: string | null
          id?: string
          name: string
          seat_count: number
          status?: Database['public']['Enums']['table_status'] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_players?: number | null
          game_id?: string | null
          id?: string
          name?: string
          seat_count?: number
          status?: Database['public']['Enums']['table_status'] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tables_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tables_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          code: string
          contact_email: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          code: string
          contact_email?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          contact_email?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      tournament_entries: {
        Row: {
          created_at: string | null
          id: string
          player_id: string | null
          position: number | null
          prize_amount: number | null
          status: Database['public']['Enums']['tournament_entry_status'] | null
          tenant_id: string | null
          tournament_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          player_id?: string | null
          position?: number | null
          prize_amount?: number | null
          status?: Database['public']['Enums']['tournament_entry_status'] | null
          tenant_id?: string | null
          tournament_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          player_id?: string | null
          position?: number | null
          prize_amount?: number | null
          status?: Database['public']['Enums']['tournament_entry_status'] | null
          tenant_id?: string | null
          tournament_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tournament_entries_player_id_fkey'
            columns: ['player_id']
            isOneToOne: false
            referencedRelation: 'players'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournament_entries_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tournament_entries_tournament_id_fkey'
            columns: ['tournament_id']
            isOneToOne: false
            referencedRelation: 'tournaments'
            referencedColumns: ['id']
          },
        ]
      }
      tournaments: {
        Row: {
          buy_in: number
          created_at: string | null
          current_players: number | null
          description: string | null
          game_type: Database['public']['Enums']['game_type']
          id: string
          max_players: number
          name: string
          prize_pool: number | null
          rake: string | null
          start_time: string
          status: Database['public']['Enums']['tournament_status'] | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          buy_in: number
          created_at?: string | null
          current_players?: number | null
          description?: string | null
          game_type: Database['public']['Enums']['game_type']
          id?: string
          max_players: number
          name: string
          prize_pool?: number | null
          rake?: string | null
          start_time: string
          status?: Database['public']['Enums']['tournament_status'] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          buy_in?: number
          created_at?: string | null
          current_players?: number | null
          description?: string | null
          game_type?: Database['public']['Enums']['game_type']
          id?: string
          max_players?: number
          name?: string
          prize_pool?: number | null
          rake?: string | null
          start_time?: string
          status?: Database['public']['Enums']['tournament_status'] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tournaments_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      waitlist_entries: {
        Row: {
          created_at: string | null
          game_id: string | null
          id: string
          notes: string | null
          player_id: string | null
          position: number
          status: Database['public']['Enums']['waitlist_status'] | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          game_id?: string | null
          id?: string
          notes?: string | null
          player_id?: string | null
          position: number
          status?: Database['public']['Enums']['waitlist_status'] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          game_id?: string | null
          id?: string
          notes?: string | null
          player_id?: string | null
          position?: number
          status?: Database['public']['Enums']['waitlist_status'] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'waitlist_entries_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'waitlist_entries_player_id_fkey'
            columns: ['player_id']
            isOneToOne: false
            referencedRelation: 'players'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'waitlist_entries_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      friendship_status: 'pending' | 'accepted' | 'blocked'
      game_type:
        | 'texas_holdem'
        | 'omaha'
        | 'seven_card_stud'
        | 'five_card_draw'
        | 'razz'
        | 'stud_hi_lo'
      operator_role: 'admin' | 'supervisor' | 'dealer'
      table_status: 'available' | 'occupied' | 'maintenance' | 'closed'
      tournament_entry_status:
        | 'registered'
        | 'checked_in'
        | 'eliminated'
        | 'finished'
      tournament_status:
        | 'scheduled'
        | 'registering'
        | 'in_progress'
        | 'completed'
        | 'cancelled'
      waitlist_status: 'waiting' | 'called' | 'seated' | 'cancelled'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      friendship_status: ['pending', 'accepted', 'blocked'],
      game_type: [
        'texas_holdem',
        'omaha',
        'seven_card_stud',
        'five_card_draw',
        'razz',
        'stud_hi_lo',
      ],
      operator_role: ['admin', 'supervisor', 'dealer'],
      table_status: ['available', 'occupied', 'maintenance', 'closed'],
      tournament_entry_status: [
        'registered',
        'checked_in',
        'eliminated',
        'finished',
      ],
      tournament_status: [
        'scheduled',
        'registering',
        'in_progress',
        'completed',
        'cancelled',
      ],
      waitlist_status: ['waiting', 'called', 'seated', 'cancelled'],
    },
  },
} as const

// Convenience type aliases for easier usage
export type Player = Tables<'players'>
export type Operator = Tables<'operators'>
export type Tenant = Tables<'tenants'>
export type Game = Tables<'games'>
export type Table = Tables<'tables'>
export type TableSeat = Tables<'table_seats'>
export type WaitlistEntry = Tables<'waitlist_entries'>
export type Tournament = Tables<'tournaments'>
export type TournamentEntry = Tables<'tournament_entries'>
export type Friendship = Tables<'friendships'>

// Insert types
export type PlayerInsert = TablesInsert<'players'>
export type OperatorInsert = TablesInsert<'operators'>
export type TenantInsert = TablesInsert<'tenants'>
export type GameInsert = TablesInsert<'games'>
export type TableInsert = TablesInsert<'tables'>
export type TableSeatInsert = TablesInsert<'table_seats'>
export type WaitlistEntryInsert = TablesInsert<'waitlist_entries'>
export type TournamentInsert = TablesInsert<'tournaments'>
export type TournamentEntryInsert = TablesInsert<'tournament_entries'>
export type FriendshipInsert = TablesInsert<'friendships'>

// Update types
export type PlayerUpdate = TablesUpdate<'players'>
export type OperatorUpdate = TablesUpdate<'operators'>
export type TenantUpdate = TablesUpdate<'tenants'>
export type GameUpdate = TablesUpdate<'games'>
export type TableUpdate = TablesUpdate<'tables'>
export type TableSeatUpdate = TablesUpdate<'table_seats'>
export type WaitlistEntryUpdate = TablesUpdate<'waitlist_entries'>
export type TournamentUpdate = TablesUpdate<'tournaments'>
export type TournamentEntryUpdate = TablesUpdate<'tournament_entries'>
export type FriendshipUpdate = TablesUpdate<'friendships'>

// Enum types
export type OperatorRole = Enums<'operator_role'>
export type GameType = Enums<'game_type'>
export type TableStatus = Enums<'table_status'>
export type WaitlistStatus = Enums<'waitlist_status'>
export type TournamentStatus = Enums<'tournament_status'>
export type TournamentEntryStatus = Enums<'tournament_entry_status'>
export type FriendshipStatus = Enums<'friendship_status'>

// API Response types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

// Form types
export interface PhoneAuthForm {
  phoneNumber: string
}

export interface OTPForm {
  otp: string
}

export interface PlayerProfileForm {
  alias: string
  email?: string
}

// Component props
export interface TenantCardProps {
  tenant: Tenant
  playerCount?: number
  activeGames?: number
}

export interface GameCardProps {
  game: Game
  waitlistCount?: number
  availableTables?: number
}

export interface FriendActivityProps {
  friend: Player & { currentLocation?: string }
  isOnline: boolean
}
