// Player preferences types
export interface PlayerPreferences {
  color_theme?: ColorTheme
  notifications?: NotificationPreferences
  privacy?: PrivacyPreferences
  display?: DisplayPreferences
}

export type ColorTheme =
  | 'neutral'
  | 'slate'
  | 'violet'
  | 'blue'
  | 'green'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'pink'
  | 'zinc'
  | 'stone'
  | 'gray'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'indigo'
  | 'purple'
  | 'fuchsia'
  | 'rose'

export interface NotificationPreferences {
  email?: boolean
  sms?: boolean
  push?: boolean
}

export interface PrivacyPreferences {
  show_online_status?: boolean
  allow_friend_requests?: boolean
  show_phone_number?: boolean
}

export interface DisplayPreferences {
  compact_mode?: boolean
  show_avatars?: boolean
  items_per_page?: number
}

// Default preferences
export const DEFAULT_PREFERENCES: PlayerPreferences = {
  color_theme: 'neutral',
  notifications: {
    email: true,
    sms: false,
    push: true,
  },
  privacy: {
    show_online_status: true,
    allow_friend_requests: true,
    show_phone_number: false,
  },
  display: {
    compact_mode: false,
    show_avatars: true,
    items_per_page: 20,
  },
}

// Utility functions for working with preferences
export function getPreference<T extends keyof PlayerPreferences>(
  preferences: PlayerPreferences | null | undefined,
  key: T,
  defaultValue: PlayerPreferences[T]
): PlayerPreferences[T] {
  if (!preferences) return defaultValue
  return preferences[key] ?? defaultValue
}

export function setPreference<T extends keyof PlayerPreferences>(
  preferences: PlayerPreferences | null | undefined,
  key: T,
  value: PlayerPreferences[T]
): PlayerPreferences {
  return {
    ...preferences,
    [key]: value,
  }
}

export function mergePreferences(
  existing: PlayerPreferences | null | undefined,
  updates: Partial<PlayerPreferences>
): PlayerPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...existing,
    ...updates,
  }
}
