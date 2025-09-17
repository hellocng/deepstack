'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWA(): {
  deferredPrompt: BeforeInstallPromptEvent | null
  isInstalled: boolean
  isInAppMode: boolean
  isLoading: boolean
  isInstallable: boolean
  installApp: () => Promise<void>
  canInstall: boolean
} {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInAppMode, setIsInAppMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    // Simple PWA mode detection
    const checkPWAMode = (): boolean => {
      const isStandalone = window.matchMedia(
        '(display-mode: standalone)'
      ).matches
      const isIOSStandalone =
        (navigator as { standalone?: boolean }).standalone === true

      if (isStandalone || isIOSStandalone) {
        setIsInstalled(true)
        setIsInAppMode(true)
        setIsInstallable(false)
        try {
          localStorage.setItem('pwa-installed', 'true')
        } catch {}
        return true
      }
      return false
    }

    // Check localStorage for previous installation
    const checkLocalStorage = (): void => {
      try {
        const wasInstalled = localStorage.getItem('pwa-installed') === 'true'
        if (wasInstalled) {
          setIsInstalled(true)
        }
      } catch {
        // localStorage not available
      }
    }

    // Check if app meets PWA criteria
    const checkPWACriteria = async (): Promise<void> => {
      const manifestLink = document.querySelector('link[rel="manifest"]')
      const hasServiceWorker = 'serviceWorker' in navigator
      const isHttps = window.location.protocol === 'https:'
      const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '0.0.0.0'

      // Test if manifest is accessible
      let manifestAccessible = false
      if (manifestLink) {
        try {
          const manifestUrl = manifestLink.getAttribute('href')
          if (manifestUrl) {
            const response = await fetch(manifestUrl)
            manifestAccessible = response.ok

            // Try to parse the manifest content
            if (manifestAccessible) {
              try {
                const manifest = await response.json()
                // Test if icons are accessible
                if (manifest.icons && manifest.icons.length > 0) {
                  for (const icon of manifest.icons) {
                    try {
                      const iconResponse = await fetch(icon.src)
                      if (!iconResponse.ok) {
                        // PWA icon not accessible
                      }
                    } catch (_error) {
                      // PWA icon fetch failed
                    }
                  }
                }
              } catch {
                // Silently handle parse errors
              }
            }
          }
        } catch {
          // Silently handle accessibility test failures
        }
      }

      // Check current PWA mode state
      const isCurrentlyInAppMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as { standalone?: boolean }).standalone === true

      // Set installable if we have the required components and we're not in PWA mode
      // HTTPS is required for production, but localhost is allowed for development
      if (
        manifestLink &&
        manifestAccessible &&
        hasServiceWorker &&
        !isCurrentlyInAppMode &&
        (isHttps || isLocalhost)
      ) {
        setIsInstallable(true)
      } else {
        setIsInstallable(false)
      }
    }

    // Initialize
    checkPWAMode()
    checkLocalStorage()

    // Run PWA criteria check after a delay
    const pwaCriteriaTimeout = setTimeout(checkPWACriteria, 1000)

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event): void => {
      // Always prevent default to show our custom install UI
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
      try {
        localStorage.removeItem('pwa-installed')
      } catch {}
    }

    // Listen for appinstalled event
    const handleAppInstalled = (): void => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      try {
        localStorage.setItem('pwa-installed', 'true')
      } catch {}
    }

    // Register service worker - DISABLED to prevent auth interference
    const registerServiceWorker = async (): Promise<void> => {
      // Service worker registration disabled to prevent auth issues
      // if ('serviceWorker' in navigator) {
      //   try {
      //     // Only register if not already registered
      //     const existingRegistration =
      //       await navigator.serviceWorker.getRegistration('/sw.js')
      //     if (!existingRegistration) {
      //       await navigator.serviceWorker.register('/sw.js')
      //     }
      //   } catch {
      //     // Silently handle service worker registration failures
      //   }
      // }
    }

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Register service worker
    registerServiceWorker()

    // Cleanup
    return (): void => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )
      window.removeEventListener('appinstalled', handleAppInstalled)
      clearTimeout(pwaCriteriaTimeout)
    }
  }, []) // Remove isInAppMode dependency to prevent infinite loop

  const installApp = async (): Promise<void> => {
    if (!deferredPrompt) {
      return
    }

    setIsLoading(true)
    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setIsInstalled(true)
        setIsInstallable(false)
        try {
          localStorage.setItem('pwa-installed', 'true')
        } catch {}
      }

      setDeferredPrompt(null)
    } catch {
      // Silently handle installation failures
    } finally {
      setIsLoading(false)
    }
  }

  return {
    deferredPrompt,
    isInstalled,
    isInAppMode,
    isInstallable,
    isLoading,
    installApp,
    canInstall: isInstallable && !isInstalled,
  }
}
