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
import type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js'
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
  session: Session | null
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
  initialSession?: Session | null
}

export function UserProvider({
  children,
  initialUser = null,
  initialSession = null,
}: UserProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(initialUser)
  const [session, setSession] = useState<Session | null>(initialSession)
  const [authUser, setAuthUser] = useState<SupabaseAuthUser | null>(null)
  const [loading, setLoading] = useState(!initialUser)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const isMountedRef = useRef(true)

  const loadUserProfile = useCallback(
    async (authId: string): Promise<void> => {
      try {
        setError(null)
        setLoading(true)

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
          setSession(null)
        } else {
          if (isMountedRef.current) {
            setError('Failed to load user profile')
          }
        }
        handleError(err, 'loadUserProfile')
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    },
    [supabase]
  )

  useEffect(() => {
    isMountedRef.current = true

    const bootstrapAuthState = async (): Promise<void> => {
      try {
        const [
          {
            data: { user: verifiedUser },
            error: userError,
          },
          {
            data: { session: currentSession },
            error: sessionError,
          },
        ] = await Promise.all([
          supabase.auth.getUser(),
          supabase.auth.getSession(),
        ])

        if (userError) {
          throw userError
        }

        if (sessionError) {
          throw sessionError
        }

        setAuthUser(verifiedUser ?? null)
        setSession(currentSession ?? null)

        if (verifiedUser) {
          const initialMatchesVerifiedUser = Boolean(
            initialUser &&
              ((initialUser.type === 'player' &&
                initialUser.profile.auth_id === verifiedUser.id) ||
                (initialUser.type === 'operator' &&
                  initialUser.profile.auth_id === verifiedUser.id))
          )

          if (!initialMatchesVerifiedUser) {
            await loadUserProfile(verifiedUser.id)
          } else {
            setLoading(false)
          }
        } else {
          if (!initialUser) {
            setUser(null)
          }
          setLoading(false)
        }
      } catch (err) {
        setAuthUser(null)
        setSession(null)
        setUser(null)
        setLoading(false)
        handleError(err, 'bootstrapAuthState')
      }
    }

    void bootstrapAuthState()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
        setAuthUser(null)
        setLoading(false)
        return
      }

      if (event === 'TOKEN_REFRESHED') {
        const {
          data: { session: refreshedSession },
          error: refreshedError,
        } = await supabase.auth.getSession()
        if (!refreshedError) {
          setSession(refreshedSession ?? null)
        }
        return
      }

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        const [
          {
            data: { user: verifiedUser },
            error: userError,
          },
          {
            data: { session: latestSession },
            error: latestSessionError,
          },
        ] = await Promise.all([
          supabase.auth.getUser(),
          supabase.auth.getSession(),
        ])

        if (userError) {
          handleError(userError, 'authStateChange.getUser')
          return
        }

        if (latestSessionError) {
          handleError(latestSessionError, 'authStateChange.getSession')
        } else {
          setSession(latestSession ?? null)
        }

        setAuthUser(verifiedUser ?? null)

        if (verifiedUser) {
          await loadUserProfile(verifiedUser.id)
        } else {
          setUser(null)
          setLoading(false)
        }
      }
    })

    return (): void => {
      isMountedRef.current = false
      subscription.unsubscribe()
    }
  }, [initialUser, loadUserProfile, supabase])

  const signOut = async (): Promise<void> => {
    try {
      // Call Supabase sign out first, before clearing local state
      // This ensures the auth state change listener works properly
      await SignOutUtils.signOutWithFallbacks()

      // Clear local state after successful sign out
      setUser(null)
      setSession(null)
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
    try {
      const [
        {
          data: { user: refreshedUser },
          error: userError,
        },
        {
          data: { session: refreshedSession },
          error: sessionError,
        },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getSession(),
      ])

      if (userError) {
        throw userError
      }

      if (sessionError) {
        throw sessionError
      }

      setAuthUser(refreshedUser ?? null)
      setSession(refreshedSession ?? null)

      if (!refreshedUser) {
        setUser(null)
        setLoading(false)
        return
      }

      await loadUserProfile(refreshedUser.id)
    } catch (_error) {
      setError('Failed to refresh user profile')
      handleError(_error, 'refreshUser')
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
    setAuthUser(null)
    return false
  }

  return (
    <UserContext.Provider
      value={{
        user,
        session,
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
