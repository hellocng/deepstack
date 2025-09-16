'use client'

import { useEffect, useState } from 'react'
import { useColorTheme } from '@/hooks/use-color-theme'
import {
  DEFAULT_PREFERENCES,
  PlayerPreferences,
  getPreference,
} from '@/types/preferences'
import { useUser } from '@/lib/auth/user-context'

export function UserThemeProvider({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  const [colorTheme, setColorTheme] = useState<string>(
    DEFAULT_PREFERENCES.color_theme!
  )
  const { user } = useUser()

  // Get user's color theme preference
  useEffect(() => {
    if (user?.type === 'player') {
      const playerPreferences = user.profile
        .preferences as PlayerPreferences | null
      const userTheme = getPreference(
        playerPreferences,
        'color_theme',
        DEFAULT_PREFERENCES.color_theme!
      )
      setColorTheme(userTheme || DEFAULT_PREFERENCES.color_theme!)
    } else {
      // For non-players or when user is not loaded, use default theme
      setColorTheme(DEFAULT_PREFERENCES.color_theme!)
    }
  }, [user])

  // Apply the color theme
  useColorTheme(colorTheme)

  return <>{children}</>
}
