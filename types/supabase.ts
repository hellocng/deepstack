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
          current_players: number | null
          description: string | null
          game_type: Database['public']['Enums']['game_type']
          id: string
          is_active: boolean | null
          max_buy_in: number
          max_players: number | null
          min_buy_in: number
          name: string
          rake: string | null
          room_id: string | null
          small_blind: number
          stakes: string | null
          updated_at: string | null
          waitlist_count: number | null
        }
        Insert: {
          big_blind: number
          created_at?: string | null
          current_players?: number | null
          description?: string | null
          game_type: Database['public']['Enums']['game_type']
          id?: string
          is_active?: boolean | null
          max_buy_in: number
          max_players?: number | null
          min_buy_in: number
          name: string
          rake?: string | null
          room_id?: string | null
          small_blind: number
          stakes?: string | null
          updated_at?: string | null
          waitlist_count?: number | null
        }
        Update: {
          big_blind?: number
          created_at?: string | null
          current_players?: number | null
          description?: string | null
          game_type?: Database['public']['Enums']['game_type']
          id?: string
          is_active?: boolean | null
          max_buy_in?: number
          max_players?: number | null
          min_buy_in?: number
          name?: string
          rake?: string | null
          room_id?: string | null
          small_blind?: number
          stakes?: string | null
          updated_at?: string | null
          waitlist_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'games_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
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
          room_id: string | null
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
          room_id?: string | null
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
          room_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'operators_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
        ]
      }
      player_sessions: {
        Row: {
          created_at: string | null
          end_time: string | null
          id: string
          player_id: string | null
          seat_number: number
          start_time: string | null
          table_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          player_id?: string | null
          seat_number: number
          start_time?: string | null
          table_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          player_id?: string | null
          seat_number?: number
          start_time?: string | null
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
        ]
      }
      players: {
        Row: {
          alias: string | null
          auth_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          last_login: string | null
          phone_number: string | null
          preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          alias?: string | null
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_login?: string | null
          phone_number?: string | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          alias?: string | null
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_login?: string | null
          phone_number?: string | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rooms: {
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
      tables: {
        Row: {
          created_at: string | null
          game_id: string | null
          id: string
          name: string
          room_id: string | null
          seat_count: number
          status: Database['public']['Enums']['table_status'] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          game_id?: string | null
          id?: string
          name: string
          room_id?: string | null
          seat_count: number
          status?: Database['public']['Enums']['table_status'] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          game_id?: string | null
          id?: string
          name?: string
          room_id?: string | null
          seat_count?: number
          status?: Database['public']['Enums']['table_status'] | null
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
            foreignKeyName: 'tables_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
        ]
      }
      tournament_entries: {
        Row: {
          created_at: string | null
          id: string
          player_id: string | null
          position: number | null
          prize_amount: number | null
          room_id: string | null
          status: Database['public']['Enums']['tournament_entry_status'] | null
          tournament_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          player_id?: string | null
          position?: number | null
          prize_amount?: number | null
          room_id?: string | null
          status?: Database['public']['Enums']['tournament_entry_status'] | null
          tournament_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          player_id?: string | null
          position?: number | null
          prize_amount?: number | null
          room_id?: string | null
          status?: Database['public']['Enums']['tournament_entry_status'] | null
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
            foreignKeyName: 'tournament_entries_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
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
          room_id: string | null
          start_time: string
          status: Database['public']['Enums']['tournament_status'] | null
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
          room_id?: string | null
          start_time: string
          status?: Database['public']['Enums']['tournament_status'] | null
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
          room_id?: string | null
          start_time?: string
          status?: Database['public']['Enums']['tournament_status'] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tournaments_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
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
          room_id: string | null
          status: Database['public']['Enums']['waitlist_status'] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          game_id?: string | null
          id?: string
          notes?: string | null
          player_id?: string | null
          position: number
          room_id?: string | null
          status?: Database['public']['Enums']['waitlist_status'] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          game_id?: string | null
          id?: string
          notes?: string | null
          player_id?: string | null
          position?: number
          room_id?: string | null
          status?: Database['public']['Enums']['waitlist_status'] | null
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
            foreignKeyName: 'waitlist_entries_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
        ]
      }
      waitlists: {
        Row: {
          game_id: string
          id: string
          joined_at: string | null
          player_id: string
          position: number
        }
        Insert: {
          game_id: string
          id?: string
          joined_at?: string | null
          player_id: string
          position: number
        }
        Update: {
          game_id?: string
          id?: string
          joined_at?: string | null
          player_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: 'waitlists_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'waitlists_player_id_fkey'
            columns: ['player_id']
            isOneToOne: false
            referencedRelation: 'players'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      end_table_session: {
        Args: { session_uuid: string }
        Returns: boolean
      }
      get_available_seats_at_table: {
        Args: { table_uuid: string }
        Returns: number
      }
      get_available_seats_at_table_session: {
        Args: { session_uuid: string }
        Returns: number
      }
      get_current_players_at_table: {
        Args: { table_uuid: string }
        Returns: number
      }
      get_current_players_at_table_session: {
        Args: { session_uuid: string }
        Returns: number
      }
      get_table_session_duration: {
        Args: { session_uuid: string }
        Returns: unknown
      }
      get_user_room_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_superadmin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_table_session_active: {
        Args: { session_uuid: string }
        Returns: boolean
      }
      is_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      start_new_table_session: {
        Args: { table_uuid: string; tenant_uuid: string }
        Returns: string
      }
      table_has_space: {
        Args: { table_uuid: string }
        Returns: boolean
      }
      table_session_has_space: {
        Args: { session_uuid: string }
        Returns: boolean
      }
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
      operator_role: 'admin' | 'supervisor' | 'dealer' | 'superadmin'
      table_status: 'open' | 'closed'
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
      operator_role: ['admin', 'supervisor', 'dealer', 'superadmin'],
      table_status: ['open', 'closed'],
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
