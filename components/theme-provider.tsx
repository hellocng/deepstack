'use client'

import { useEffect, useState } from 'react'
import { usePlayerAuth } from '@/lib/auth/player-auth-context'
import { useColorTheme } from '@/hooks/use-color-theme'

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  const { player } = usePlayerAuth()
  const [mounted, setMounted] = useState(false)

  // Get the user's preferred color theme from their profile
  const userColorTheme = (player as any)?.color_theme || 'neutral'

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
