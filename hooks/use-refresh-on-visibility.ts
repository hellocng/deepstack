'use client'

import { useCallback, useRef } from 'react'
import { usePageVisibility } from './use-page-visibility'

interface UseRefreshOnVisibilityOptions {
  refreshFn: () => Promise<void> | void
  debounceMs?: number
  enabled?: boolean
}

export function useRefreshOnVisibility({
  refreshFn,
  debounceMs = 100,
  enabled = true,
}: UseRefreshOnVisibilityOptions): void {
  const lastRefreshRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleVisibilityChange = useCallback(async () => {
    if (!enabled) return

    // Prevent too frequent refreshes
    const now = Date.now()
    if (now - lastRefreshRef.current < 2000) {
      return
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Debounce the refresh
    timeoutRef.current = setTimeout(async () => {
      try {
        await refreshFn()
        lastRefreshRef.current = Date.now()
      } catch (error) {
        console.error('Error refreshing data on visibility change:', error)
      }
    }, debounceMs)
  }, [refreshFn, debounceMs, enabled])

  usePageVisibility({
    onVisible: handleVisibilityChange,
  })
}
