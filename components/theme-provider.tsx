'use client'

import { useEffect, useState } from 'react'
import { usePlayerAuth } from '@/lib/auth/player-auth-context'
import { useColorTheme } from '@/hooks/use-color-theme'
import {
  PlayerPreferences,
  getPreference,
  DEFAULT_PREFERENCES,
} from '@/types/preferences'

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  const { player } = usePlayerAuth()
  const [mounted, setMounted] = useState(false)

  // Get the user's preferred color theme from their profile
  const playerPreferences = player?.preferences as PlayerPreferences | null
  const userColorTheme = getPreference(
    playerPreferences,
    'color_theme',
    DEFAULT_PREFERENCES.color_theme!
  )

  // Apply the color theme
  useColorTheme(userColorTheme)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>
  }

  return <>{children}</>
}
