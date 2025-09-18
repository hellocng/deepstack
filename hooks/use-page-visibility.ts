'use client'

import { useEffect, useState, useCallback } from 'react'

interface UsePageVisibilityOptions {
  onVisible?: () => void
  onHidden?: () => void
  debounceMs?: number
}

export function usePageVisibility({
  onVisible,
  onHidden,
  debounceMs = 100,
}: UsePageVisibilityOptions = {}): {
  isVisible: boolean
  isHidden: boolean
  visibilityCount: number
} {
  const [isVisible, setIsVisible] = useState(
    typeof document !== 'undefined' ? !document.hidden : true
  )
  const [visibilityCount, setVisibilityCount] = useState(0)

  const handleVisibilityChange = useCallback(() => {
    const visible = !document.hidden
    setIsVisible(visible)

    if (visible) {
      setVisibilityCount((prev) => prev + 1)

      // Debounce the onVisible callback
      if (onVisible) {
        setTimeout(() => {
          onVisible()
        }, debounceMs)
      }
    } else if (onHidden) {
      onHidden()
    }
  }, [onVisible, onHidden, debounceMs])

  useEffect(() => {
    if (typeof document === 'undefined') return

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)
    window.addEventListener('blur', handleVisibilityChange)

    return (): void => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
      window.removeEventListener('blur', handleVisibilityChange)
    }
  }, [handleVisibilityChange])

  return {
    isVisible,
    isHidden: !isVisible,
    visibilityCount,
  }
}
