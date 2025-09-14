'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/types/supabase'

type Player = Tables<'players'>

interface PlayerAuthContextType {
  player: Player | null
  loading: boolean
  sendOTP: (phoneNumber: string) => Promise<void>
  verifyOTP: (phoneNumber: string, token: string) => Promise<boolean>
  signOut: () => Promise<void>
}

const PlayerAuthContext = createContext<PlayerAuthContextType | undefined>(
  undefined
)

export function PlayerAuthProvider({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async (): Promise<void> => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        try {
          // Get player profile from database
          const { data: playerProfile, error } = await supabase
            .from('players')
            .select('*')
            .eq('auth_id', session.user.id)
            .single()

          if (error) {
            // Error('Error loading player profile:', error)
            // If no player profile found, don't set player to null
            // The profile might be created during OTP verification
            if (error.code !== 'PGRST116') {
              setPlayer(null)
            }
          } else {
            setPlayer(playerProfile)
          }
        } catch (_error) {
          // Error loading player profile
        }
      }

      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          // Get player profile from database
          const { data: playerProfile, error } = await supabase
            .from('players')
            .select('*')
            .eq('auth_id', session.user.id)
            .single()

          if (error) {
            // Error('Error loading player profile:', error)
            // If no player profile found, don't set player to null
            // The profile might be created during OTP verification
            if (error.code !== 'PGRST116') {
              setPlayer(null)
            }
          } else {
            setPlayer(playerProfile)
          }
        } catch (_error) {
          // Error loading player profile
        }
      } else {
        setPlayer(null)
      }
      setLoading(false)
    })

    return (): void => subscription.unsubscribe()
  }, [supabase])

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

    let needsAlias = false

    // Check if player profile exists, if not create one
    if (data.user) {
      try {
        const { data: existingPlayer, error: selectError } = await supabase
          .from('players')
          .select('*')
          .eq('auth_id', data.user.id)
          .single()

        if (selectError && selectError.code === 'PGRST116') {
          // No player found, create new profile with null alias
          const { error: insertError } = await supabase.from('players').insert({
            phone_number: phoneNumber,
            alias: null as string | null,
            auth_id: data.user.id,
          })

          if (insertError) {
            // Error('Error creating player profile:', insertError)
            throw insertError
          }

          // After creating the profile, fetch it and set it in state
          const { data: newPlayer, error: fetchError } = await supabase
            .from('players')
            .select('*')
            .eq('auth_id', data.user.id)
            .single()

          if (fetchError) {
            // Error('Error fetching new player profile:', fetchError)
          } else {
            setPlayer(newPlayer)
            // New users need to set a proper alias
            needsAlias = true
          }
        } else if (selectError) {
          // Error('Error checking player profile:', selectError)
          throw selectError
        } else if (existingPlayer) {
          // Player exists, check if they need to set an alias
          setPlayer(existingPlayer)
          // Check if alias is null (needs to be set)
          needsAlias = !existingPlayer.alias
        }
      } catch (error) {
        // Error('Error in verifyOTP:', error)
        throw error
      }
    }

    return needsAlias
  }

  const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    // Clear player state immediately
    setPlayer(null)
  }

  return (
    <PlayerAuthContext.Provider
      value={{
        player,
        loading,
        sendOTP,
        verifyOTP,
        signOut,
      }}
    >
      {children}
    </PlayerAuthContext.Provider>
  )
}

export function usePlayerAuth(): PlayerAuthContextType {
  const context = useContext(PlayerAuthContext)
  if (context === undefined) {
    throw new Error('usePlayerAuth must be used within a PlayerAuthProvider')
  }
  return context
}
