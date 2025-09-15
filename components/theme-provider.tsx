'use client'

import { useEffect, useState } from 'react'
import { usePlayer } from '@/lib/auth/user-context'
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
  const [mounted, setMounted] = useState(false)

  const player = usePlayer()
  const playerPreferences = player?.profile
    .preferences as PlayerPreferences | null
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
