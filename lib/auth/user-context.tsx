'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables, TablesUpdate, TablesInsert } from '@/types/supabase'

type Room = Tables<'rooms'>
type Player = Tables<'players'>
type Operator = Tables<'operators'>

export interface PlayerUser {
  type: 'player'
  profile: Player
}

export interface OperatorUser {
  type: 'operator'
  profile: Operator
  room: Room | null
}

export type User = PlayerUser | OperatorUser

interface UserContextType {
  user: User | null
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
  updateUser: (updates: Partial<Player> | Partial<Operator>) => Promise<void>
  refreshUser: () => Promise<void>
  sendOTP: (phoneNumber: string) => Promise<void>
  verifyOTP: (phoneNumber: string, token: string) => Promise<boolean>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const loadUserProfile = useCallback(
    async (authId: string): Promise<void> => {
      try {
        setError(null)

        // First, try to load as operator
        const { data: operator, error: operatorError } = await supabase
          .from('operators')
          .select(
            `
          *,
          room:rooms(*)
        `
          )
          .eq('auth_id', authId)
          .eq('is_active', true)
          .single()

        if (operator && !operatorError) {
          // User is an operator
          setUser({
            type: 'operator',
            profile: operator,
            room: operator.room as Room | null,
          })
          setLoading(false)
          return
        }

        // If operator query failed due to RLS policies (user is not an operator),
        // continue to try loading as player

        // Try to load as player
        const { data: player, error: playerError } = await supabase
          .from('players')
          .select('*')
          .eq('auth_id', authId)
          .single()

        if (player && !playerError) {
          // User is a player
          setUser({
            type: 'player',
            profile: player,
          })
          setLoading(false)
          return
        }

        // If neither operator nor player found, set user to null
        // This might be a new user who hasn't completed profile setup
        setUser(null)
        setLoading(false)
      } catch (_err) {
        // Error loading user profile
        setError('Failed to load user profile')
        setLoading(false)
      }
    },
    [supabase]
  )

  useEffect(() => {
    // Get initial user (authenticated via server)
    const getInitialUser = async (): Promise<void> => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (user && !error) {
        await loadUserProfile(user.id)
        setLoading(false)
      } else {
        setUser(null)
        setLoading(false)
      }
    }

    getInitialUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Verify the session with the server for security
      if (session?.user) {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (user && !error) {
          await loadUserProfile(user.id)
          setLoading(false)
        } else {
          setUser(null)
          setLoading(false)
        }
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return (): void => subscription.unsubscribe()
  }, [loadUserProfile, supabase])

  const signOut = async (): Promise<void> => {
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (_err) {
      // Error signing out
      setError('Failed to sign out')
    }
  }

  const updateUser = async (
    updates: TablesUpdate<'players'> | TablesUpdate<'operators'>
  ): Promise<void> => {
    if (!user) return

    try {
      if (user.type === 'player') {
        const { error } = await supabase
          .from('players')
          .update(updates as TablesUpdate<'players'>)
          .eq('id', user.profile.id)

        if (error) throw error

        // Update local state
        setUser({
          ...user,
          profile: { ...user.profile, ...updates } as Player,
        })
      } else if (user.type === 'operator') {
        const { error } = await supabase
          .from('operators')
          .update(updates as TablesUpdate<'operators'>)
          .eq('id', user.profile.id)

        if (error) throw error

        // Update local state
        setUser({
          ...user,
          profile: { ...user.profile, ...updates } as Operator,
        })
      }
    } catch (_err) {
      // Error updating user
      setError('Failed to update user profile')
    }
  }

  const refreshUser = async (): Promise<void> => {
    if (!user || !user.profile.auth_id) return

    try {
      setLoading(true)
      await loadUserProfile(user.profile.auth_id)
    } catch (_error) {
      setError('Failed to refresh user profile')
    } finally {
      setLoading(false)
    }
  }

  const sendOTP = async (phoneNumber: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
      options: {
        channel: 'sms',
      },
    })
    if (error) throw error
  }

  const verifyOTP = async (
    phoneNumber: string,
    token: string
  ): Promise<boolean> => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token,
      type: 'sms',
    })

    if (error) throw error

    if (data.user) {
      // Check if player profile exists
      const { data: existingPlayer, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('auth_id', data.user.id)
        .single()

      if (playerError && playerError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for new users
        throw playerError
      }

      if (existingPlayer) {
        // Existing player - load their profile
        setUser({
          type: 'player',
          profile: existingPlayer,
        })
        setLoading(false)
        return !existingPlayer.alias // Return true if alias needs to be set
      } else {
        // New player - create profile
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert({
            auth_id: data.user.id,
            phone_number: phoneNumber,
            preferences: {},
          } as TablesInsert<'players'>)
          .select()
          .single()

        if (createError) throw createError

        setUser({
          type: 'player',
          profile: newPlayer,
        })
        setLoading(false)
        return true // New player needs to set alias
      }
    }

    setLoading(false)
    return false
  }

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        error,
        signOut,
        updateUser,
        refreshUser,
        sendOTP,
        verifyOTP,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): UserContextType {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

// Convenience hooks for type-safe access
export function usePlayer(): PlayerUser | null {
  const { user } = useUser()
  return user?.type === 'player' ? user : null
}

export function useOperator(): OperatorUser | null {
  const { user } = useUser()
  return user?.type === 'operator' ? user : null
}

export function useSuperAdmin(): OperatorUser | null {
  const { user } = useUser()
  return user?.type === 'operator' &&
    (user.profile.role as string) === 'superadmin'
    ? user
    : null
}

export function useRoomAdmin(): OperatorUser | null {
  const { user } = useUser()
  return user?.type === 'operator' &&
    ['admin', 'supervisor'].includes(user.profile.role) &&
    user.room
    ? user
    : null
}
