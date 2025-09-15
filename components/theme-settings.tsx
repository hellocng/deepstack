'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Palette, Check } from 'lucide-react'
import { usePlayerAuth } from '@/lib/auth/player-auth-context'
import { Tables } from '@/types/supabase'
import {
  PlayerPreferences,
  getPreference,
  setPreference,
  DEFAULT_PREFERENCES,
} from '@/types/preferences'

type Player = Tables<'players'>

// Available color themes (matching 10xgaming)
const colorThemes = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'slate', label: 'Slate' },
  { value: 'violet', label: 'Violet' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'red', label: 'Red' },
  { value: 'orange', label: 'Orange' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'pink', label: 'Pink' },
  { value: 'zinc', label: 'Zinc' },
  { value: 'stone', label: 'Stone' },
  { value: 'gray', label: 'Gray' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'teal', label: 'Teal' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'sky', label: 'Sky' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'purple', label: 'Purple' },
  { value: 'fuchsia', label: 'Fuchsia' },
  { value: 'rose', label: 'Rose' },
]

interface ThemeSettingsProps {
  player: Player
  onThemeChange?: (theme: string) => void
}

export function ThemeSettings({
  player,
  onThemeChange,
}: ThemeSettingsProps): JSX.Element {
  const { updatePlayer } = usePlayerAuth()
  const [selectedTheme, setSelectedTheme] = useState<string>('neutral')
  const [saving, setSaving] = useState(false)
  const [originalTheme, setOriginalTheme] = useState<string>('neutral')

  // Initialize theme from player data
  useEffect(() => {
    const playerPreferences = player?.preferences as PlayerPreferences | null
    const playerTheme = getPreference(
      playerPreferences,
      'color_theme',
      DEFAULT_PREFERENCES.color_theme!
    )
    setSelectedTheme(playerTheme)
    setOriginalTheme(playerTheme)
  }, [player])

  const handleThemeChange = async (theme: string): Promise<void> => {
    setSelectedTheme(theme)
    setSaving(true)

    try {
      // Get current preferences and update color theme
      const currentPreferences =
        (player?.preferences as PlayerPreferences) || {}
      const updatedPreferences = setPreference(
        currentPreferences,
        'color_theme',
        theme as any
      )

      // Update the player's preferences using the auth context
      await updatePlayer({ preferences: updatedPreferences } as any)

      // Update original theme on success
      setOriginalTheme(theme)

      // Notify parent component
      onThemeChange?.(theme)
    } catch (error) {
      console.error('Error updating theme:', error)
      // Revert on error
      setSelectedTheme(originalTheme)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = selectedTheme !== originalTheme

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center space-x-2'>
          <Palette className='h-5 w-5' />
          <span>Color Theme</span>
        </CardTitle>
        <CardDescription>
          Choose your preferred color theme for the application
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='color-theme'>Theme</Label>
          <Select
            value={selectedTheme}
            onValueChange={handleThemeChange}
            disabled={saving}
          >
            <SelectTrigger>
              <SelectValue placeholder='Select a theme' />
            </SelectTrigger>
            <SelectContent>
              {colorThemes.map((theme) => (
                <SelectItem
                  key={theme.value}
                  value={theme.value}
                >
                  <div className='flex items-center justify-between w-full'>
                    <span>{theme.label}</span>
                    {selectedTheme === theme.value && (
                      <Check className='h-4 w-4 ml-2' />
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasChanges && (
            <p className='text-sm text-muted-foreground'>
              Theme will be applied immediately
            </p>
          )}
        </div>

        <Separator />

        <div className='text-sm text-muted-foreground'>
          <p>
            Your theme preference will be saved to your account and applied
            across all your devices.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
