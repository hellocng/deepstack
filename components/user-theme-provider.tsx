'use client'

import { useEffect, useState } from 'react'
import { useColorTheme } from '@/hooks/use-color-theme'
import {
  DEFAULT_PREFERENCES,
  PlayerPreferences,
  getPreference,
} from '@/types/preferences'
import { useUser, useOperator } from '@/lib/auth/user-context'

export function UserThemeProvider({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  const [colorTheme, setColorTheme] = useState<string>(
    DEFAULT_PREFERENCES.color_theme!
  )
  const { user } = useUser()
  const operator = useOperator()

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
    } else if (operator) {
      // For operators, use the room's theme preference
      const roomTheme = operator.room?.theme_preference
      if (roomTheme) {
        setColorTheme(roomTheme)
      } else {
        setColorTheme(DEFAULT_PREFERENCES.color_theme!)
      }
    } else {
      // For non-players/operators or when user is not loaded, use default theme
      setColorTheme(DEFAULT_PREFERENCES.color_theme!)
    }
  }, [user, operator])

  // Listen for room theme changes
  useEffect(() => {
    const handleRoomThemeChange = (event: CustomEvent): void => {
      if (operator && event.detail?.theme) {
        setColorTheme(event.detail.theme)
      }
    }

    window.addEventListener(
      'operator-theme-changed',
      handleRoomThemeChange as EventListener
    )

    return (): void => {
      window.removeEventListener(
        'operator-theme-changed',
        handleRoomThemeChange as EventListener
      )
    }
  }, [operator])

  // Apply the color theme
  useColorTheme(colorTheme)

  return <>{children}</>
}
