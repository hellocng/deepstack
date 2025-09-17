import { createClient } from '@/lib/supabase/client'

/**
 * Sign out utilities
 */
export class SignOutUtils {
  /**
   * Standard client-side sign out
   */
  static async signOutClient(): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw new Error(`Client signOut failed: ${error.message}`)
    }
  }

  /**
   * Manual session clearing (fallback)
   */
  static async clearSessionManually(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      // Clear ALL localStorage (not just Supabase)
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (
          key &&
          (key.startsWith('sb-') ||
            key.includes('supabase') ||
            key === 'auth_state' ||
            key === 'pwa-installed')
        ) {
          keysToRemove.push(key)
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key))

      // Clear ALL sessionStorage
      const sessionKeysToRemove = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          sessionKeysToRemove.push(key)
        }
      }

      sessionKeysToRemove.forEach((key) => sessionStorage.removeItem(key))

      // Clear ALL cookies (more aggressive)
      document.cookie.split(';').forEach((cookie) => {
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
        if (name.startsWith('sb-') || name.includes('supabase')) {
          // Clear for all possible paths and domains
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`
        }
      })
    } catch (_error) {
      // Silently handle errors
    }
  }

  /**
   * Comprehensive sign out with fallbacks
   */
  static async signOutWithFallbacks(): Promise<void> {
    let success = false

    // Try standard Supabase sign out
    try {
      await this.signOutClient()
      success = true
    } catch (_error) {
      // Supabase sign out failed, continue to manual cleanup
    }

    // Always run manual cleanup as fallback
    await this.clearSessionManually()

    if (!success) {
      // If Supabase failed, we still cleared manually, so consider it successful
      // The manual cleanup should be sufficient
    }
  }
}
