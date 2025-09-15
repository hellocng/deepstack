'use client'

import { useEffect, useState } from 'react'
import { useColorTheme } from '@/hooks/use-color-theme'
import { DEFAULT_PREFERENCES } from '@/types/preferences'

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  const [mounted, setMounted] = useState(false)

  // Use default theme to avoid circular dependency with UserProvider
  const userColorTheme = DEFAULT_PREFERENCES.color_theme!

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
