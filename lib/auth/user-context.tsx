'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Tables, TablesUpdate, TablesInsert } from '@/types'
import { handleError, isExpectedAuthError } from '@/lib/utils/error-handler'

type Room = Tables<'rooms'>
type Player = Tables<'players'>
type Operator = Tables<'operators'>

export interface PlayerUser {
  type: 'player'
  profile: Player
  phoneNumber?: string
}

export interface OperatorUser {
  type: 'operator'
  profile: Operator
  room: Room | null
}

export type User = PlayerUser | OperatorUser

interface UserContextType {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
  updateUser: (updates: Partial<Player> | Partial<Operator>) => Promise<void>
  refreshUser: () => Promise<void>
  sendOTP: (phoneNumber: string) => Promise<void>
  verifyOTP: (phoneNumber: string, token: string) => Promise<boolean>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: React.ReactNode
  initialUser?: User | null
}

export function UserProvider({
  children,
  initialUser = null,
}: UserProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(initialUser)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(!initialUser) // No loading if we have initial data
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const loadUserProfile = useCallback(
    async (authId: string): Promise<void> => {
      try {
        setError(null)

        const {
          data: { session: activeSession },
          error: _sessionError,
        } = await supabase.auth.getSession()

        // Session error handled gracefully

        setSession(activeSession ?? null)

        // First, check if user is an operator (including superadmin)
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

        // Operator query completed

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

        // If no operator profile found, try to load as player
        const { data: player, error: playerError } = await supabase
          .from('players')
          .select('*')
          .eq('auth_id', authId)
          .single()

        if (player && !playerError) {
          // Read phone number from the active session to avoid additional network calls
          // User is a player
          setUser({
            type: 'player',
            profile: player,
            phoneNumber: activeSession?.user?.phone || undefined,
          })
          setLoading(false)
          return
        }

        // If neither operator nor player found, set user to null
        // This might be a new user who hasn't completed profile setup
        setUser(null)
        setLoading(false)
      } catch (err) {
        // Handle expected authentication errors gracefully
        if (isExpectedAuthError(err)) {
          // Silently handle expected auth errors (user not found, etc.)
          setUser(null)
          setSession(null)
        } else {
          setError('Failed to load user profile')
        }
        setLoading(false)
        handleError(err, 'loadUserProfile')
      }
    },
    [supabase]
  )

  useEffect(() => {
    let isMounted = true

    const bootstrapSession = async (): Promise<void> => {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession()

        if (!isMounted) return

        if (!error && currentSession?.user) {
          setSession(currentSession)
          await loadUserProfile(currentSession.user.id)
        } else {
          if (!initialUser) {
            setUser(null)
          }
          setSession(null)
          setLoading(false)
        }
      } catch (err) {
        if (!isMounted) return
        setSession(null)
        setUser(null)
        setLoading(false)
        handleError(err, 'bootstrapSession')
      }
    }

    if (!initialUser) {
      void bootstrapSession()
    } else {
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (isMounted) {
            setSession(data.session ?? null)
          }
        })
        .catch((err) => {
          if (isMounted) {
            handleError(err, 'syncInitialSession')
            setSession(null)
          }
        })
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) return

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
        setLoading(false)
        return
      }

      if (nextSession?.user) {
        setSession(nextSession)
        await loadUserProfile(nextSession.user.id)
      }
    })

    return (): void => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [initialUser, loadUserProfile, supabase])

  const signOut = async (): Promise<void> => {
    try {
      // Sign out from Supabase (this handles all storage clearing automatically)
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      // Clear local state after successful sign out
      setUser(null)
      setSession(null)
      setError(null)

      // Redirect to home page
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    } catch (error) {
      throw error
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
    } catch (err) {
      // Error updating user
      setError('Failed to update user profile')
      throw err // Re-throw the error so calling code can handle it
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

    setSession(data.session ?? null)

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
          phoneNumber: phoneNumber,
        })
        setLoading(false)
        return !existingPlayer.alias // Return true if alias needs to be set
      } else {
        // New player - create profile
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert({
            auth_id: data.user.id,
            preferences: {},
          } as TablesInsert<'players'>)
          .select()
          .single()

        if (createError) throw createError

        setUser({
          type: 'player',
          profile: newPlayer,
          phoneNumber: phoneNumber,
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
        session,
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

  // User role check completed

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
