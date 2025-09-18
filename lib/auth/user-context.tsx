'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import type { User as SupabaseAuthUser } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Tables, TablesUpdate, TablesInsert } from '@/types'
import { handleError, isExpectedAuthError } from '@/lib/utils/error-handler'
import { SignOutUtils } from './signout-utils'

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
  authUser: SupabaseAuthUser | null
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
  const [authUser, setAuthUser] = useState<SupabaseAuthUser | null>(null)
  const [loading, setLoading] = useState(!initialUser)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const isMountedRef = useRef(true)
  const isSyncingRef = useRef(false)
  const lastSyncTimeRef = useRef<number>(0)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const syncUserRef = useRef<typeof syncUser>()

  const loadUserProfile = useCallback(
    async (authId: string, showLoading = true): Promise<void> => {
      try {
        setError(null)
        if (showLoading) {
          setLoading(true)
        }

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
          .maybeSingle()

        if (operatorError && operatorError.code !== 'PGRST116') {
          throw operatorError
        }

        if (operator) {
          if (!isMountedRef.current) return
          setUser({
            type: 'operator',
            profile: operator,
            room: operator.room as Room | null,
          })
          return
        }

        const { data: player, error: playerError } = await supabase
          .from('players')
          .select('*')
          .eq('auth_id', authId)
          .maybeSingle()

        if (playerError && playerError.code !== 'PGRST116') {
          throw playerError
        }

        if (player) {
          if (!isMountedRef.current) return
          setUser({
            type: 'player',
            profile: player,
            phoneNumber: undefined,
          })
          return
        }

        if (!isMountedRef.current) return
        setUser(null)
      } catch (err) {
        if (isExpectedAuthError(err)) {
          if (!isMountedRef.current) return
          setUser(null)
        } else {
          if (isMountedRef.current) {
            setError('Failed to load user profile')
          }
        }
        handleError(err, 'loadUserProfile')
      } finally {
        if (isMountedRef.current && showLoading) {
          setLoading(false)
        }
      }
    },
    [supabase]
  )

  const syncUser = useCallback(
    async (forceRefresh = false): Promise<boolean> => {
      try {
        if (!isMountedRef.current) return false

        // Prevent too frequent syncs (unless forced)
        const now = Date.now()
        if (!forceRefresh && now - lastSyncTimeRef.current < 5000) {
          return true
        }

        if (isSyncingRef.current) {
          return true
        }

        isSyncingRef.current = true
        lastSyncTimeRef.current = now

        // Only show loading if we don't have user data yet
        if (!user) {
          setLoading(true)
        } else if (forceRefresh) {
          // For force refresh with existing user, don't show loading to avoid avatar flicker
          // The data will refresh in the background
        }
        setError(null)

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (!session) {
          setAuthUser(null)
          setUser(null)
          setLoading(false)
          return true
        }

        const {
          data: { user: verifiedUser },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          throw userError
        }

        if (!isMountedRef.current) return false

        setAuthUser(verifiedUser ?? null)

        if (!verifiedUser) {
          setUser(null)
          setLoading(false)
          return true
        }

        // Always load profile for force refresh, or if no user is loaded yet
        if (forceRefresh || !user) {
          await loadUserProfile(verifiedUser.id, !user) // Only show loading if no user yet
          return true
        }

        // Check if we need to reload profile based on auth ID
        const currentAuthId = user.profile.auth_id
        if (currentAuthId !== verifiedUser.id) {
          await loadUserProfile(verifiedUser.id, false) // Don't show loading for background refresh
          return true
        }

        // No need to reload, just ensure loading is false if we had user data
        if (user) {
          setLoading(false)
        }
        return true
      } catch (err) {
        if (!isMountedRef.current) return false
        const isSessionMissing =
          typeof err === 'object' &&
          err !== null &&
          'name' in err &&
          (err as { name?: string }).name === 'AuthSessionMissingError'

        setAuthUser(null)
        setUser(null)
        setLoading(false)

        if (!isSessionMissing) {
          setError('Failed to load user profile')
          handleError(err, 'syncUser')
        }

        return false
      } finally {
        isSyncingRef.current = false
      }
    },
    [supabase, loadUserProfile, user]
  )

  // Store the latest syncUser function in a ref
  syncUserRef.current = syncUser

  // Handle page visibility changes (tab switching)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleVisibilityChange = (): void => {
      if (!isMountedRef.current) return

      // When page becomes visible again, refresh user data in background
      if (!document.hidden) {
        // Clear any existing timeout
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current)
        }

        // Debounce the sync to avoid multiple rapid calls
        syncTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current && syncUserRef.current) {
            void syncUserRef.current(true) // Force refresh when coming back to tab
          }
        }, 100)
      }
    }

    const handleFocus = (): void => {
      if (!isMountedRef.current) return

      // Also handle window focus as a fallback
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }

      syncTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && syncUserRef.current) {
          void syncUserRef.current(true) // Force refresh when window gains focus
        }
      }, 100)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, []) // Remove syncUser from dependencies to prevent infinite loop

  useEffect(() => {
    isMountedRef.current = true

    void syncUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (!isMountedRef.current) return

      if (event === 'SIGNED_OUT') {
        setAuthUser(null)
        setUser(null)
        setLoading(false)
        return
      }

      if (
        event === 'SIGNED_IN' ||
        event === 'USER_UPDATED' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'INITIAL_SESSION'
      ) {
        if (syncUserRef.current) {
          await syncUserRef.current(true) // Force refresh on auth events
        }
      }
    })

    return (): void => {
      isMountedRef.current = false
      subscription.unsubscribe()
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, []) // Remove dependencies to prevent infinite loop

  const signOut = async (): Promise<void> => {
    try {
      // Call Supabase sign out first, before clearing local state
      // This ensures the auth state change listener works properly
      await SignOutUtils.signOutWithFallbacks()

      // Clear local state after successful sign out
      setUser(null)
      setAuthUser(null)
      setError(null)
      setLoading(false)

      // Redirect to home page
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    } catch (error) {
      setError('Failed to sign out. Please refresh the page.')
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
    await syncUser(true)
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
      const {
        data: { user: verifiedUser },
        error: getUserError,
      } = await supabase.auth.getUser()

      if (getUserError) {
        throw getUserError
      }

      setAuthUser(verifiedUser ?? null)

      if (!verifiedUser) {
        setUser(null)
        setLoading(false)
        return false
      }

      // Check if player profile exists
      const { data: existingPlayer, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('auth_id', verifiedUser.id)
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
            auth_id: verifiedUser.id,
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
        authUser,
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
