// Database types
export interface Player {
  id: string
  phone_number: string
  alias: string
  avatar_url?: string
  email?: string
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

export interface Operator {
  id: string
  email: string
  first_name: string
  last_name: string
  phone_number?: string
  avatar_url?: string
  tenant_id: string
  role: 'admin' | 'supervisor' | 'dealer'
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

export interface Tenant {
  id: string
  name: string
  code: string
  description?: string
  logo_url?: string
  address?: string
  phone?: string
  website?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Game {
  id: string
  name: string
  type:
    | 'texas_holdem'
    | 'omaha'
    | 'seven_card_stud'
    | 'five_card_draw'
    | 'razz'
    | 'stud_hi_lo'
  small_blind: number
  big_blind: number
  min_buy_in: number
  max_buy_in: number
  max_players: number
  rake?: string
  is_active: boolean
  tenant_id: string
  created_at: string
  updated_at: string
}

export interface Table {
  id: string
  name: string
  game_id: string
  status: 'available' | 'occupied' | 'maintenance' | 'closed'
  current_players: number
  max_players: number
  tenant_id: string
  created_at: string
  updated_at: string
}

export interface WaitlistEntry {
  id: string
  player_id: string
  game_id: string
  position: number
  status: 'waiting' | 'called' | 'seated' | 'cancelled'
  notes?: string
  tenant_id: string
  created_at: string
  updated_at: string
}

export interface Tournament {
  id: string
  name: string
  type: 'sit_and_go' | 'multi_table' | 'satellite'
  buy_in: number
  prize_pool: number
  max_players: number
  current_players: number
  start_time: string
  status:
    | 'scheduled'
    | 'registering'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
  rake?: string
  tenant_id: string
  created_at: string
  updated_at: string
}

export interface Friendship {
  id: string
  player_id: string
  friend_id: string
  status: 'pending' | 'accepted' | 'blocked'
  created_at: string
  updated_at: string
}

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
