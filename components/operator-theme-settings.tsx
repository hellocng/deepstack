'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOperator, useUser } from '@/lib/auth/user-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Palette } from 'lucide-react'
import { toast } from 'sonner'

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

interface OperatorThemeSettingsProps {
  onThemeChange?: (theme: string) => void
}

export function OperatorThemeSettings({
  onThemeChange,
}: OperatorThemeSettingsProps): JSX.Element {
  const [selectedTheme, setSelectedTheme] = useState<string>('neutral')
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const operator = useOperator()
  const { refreshUser } = useUser()

  // Handle hydration and load room theme
  useEffect(() => {
    setMounted(true)

    // Load theme from room preference
    if (operator?.room?.theme_preference) {
      setSelectedTheme(operator.room.theme_preference)
    }
  }, [operator])

  const handleThemeChange = async (theme: string): Promise<void> => {
    if (!operator?.room?.id) {
      toast.error('Unable to update theme: room information not available')
      return
    }

    setSelectedTheme(theme)
    setSaving(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('rooms')
        .update({
          theme_preference: theme,
          updated_at: new Date().toISOString(),
        })
        .eq('id', operator.room.id)

      if (error) {
        console.error('Error updating room theme:', error)
        toast.error('Failed to update room theme')
        return
      }

      // Refresh user data to get updated room information
      await refreshUser()

      // Dispatch a custom event to notify other components of theme change
      window.dispatchEvent(
        new CustomEvent('operator-theme-changed', {
          detail: { theme },
        })
      )

      onThemeChange?.(theme)
      toast.success('Room theme updated successfully')
    } catch (error) {
      console.error('Error updating room theme:', error)
      toast.error('An unexpected error occurred while updating theme')
    } finally {
      setSaving(false)
    }
  }

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Palette className='h-5 w-5' />
            Theme Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-8'>
            <div className='text-sm text-muted-foreground'>
              Loading theme settings...
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Palette className='h-5 w-5' />
          Theme Settings
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-2'>
          <Label>Color Theme</Label>
          <p className='text-sm text-muted-foreground'>
            Choose the color theme for this room&apos;s admin interface. This
            setting applies to all operators in the room.
          </p>
        </div>

        <Select
          value={selectedTheme}
          onValueChange={handleThemeChange}
          disabled={saving}
        >
          <SelectTrigger className='w-full'>
            <SelectValue
              placeholder={saving ? 'Saving...' : 'Select a theme'}
            />
          </SelectTrigger>
          <SelectContent>
            {colorThemes.map((theme) => (
              <SelectItem
                key={theme.value}
                value={theme.value}
              >
                <div className='flex items-center gap-2'>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      theme.value === 'neutral'
                        ? 'bg-gray-500'
                        : theme.value === 'slate'
                          ? 'bg-slate-500'
                          : theme.value === 'violet'
                            ? 'bg-violet-500'
                            : theme.value === 'blue'
                              ? 'bg-blue-500'
                              : theme.value === 'green'
                                ? 'bg-green-500'
                                : theme.value === 'red'
                                  ? 'bg-red-500'
                                  : theme.value === 'orange'
                                    ? 'bg-orange-500'
                                    : theme.value === 'yellow'
                                      ? 'bg-yellow-500'
                                      : theme.value === 'pink'
                                        ? 'bg-pink-500'
                                        : theme.value === 'zinc'
                                          ? 'bg-zinc-500'
                                          : theme.value === 'stone'
                                            ? 'bg-stone-500'
                                            : theme.value === 'gray'
                                              ? 'bg-gray-500'
                                              : theme.value === 'emerald'
                                                ? 'bg-emerald-500'
                                                : theme.value === 'teal'
                                                  ? 'bg-teal-500'
                                                  : theme.value === 'cyan'
                                                    ? 'bg-cyan-500'
                                                    : theme.value === 'sky'
                                                      ? 'bg-sky-500'
                                                      : theme.value === 'indigo'
                                                        ? 'bg-indigo-500'
                                                        : theme.value ===
                                                            'purple'
                                                          ? 'bg-purple-500'
                                                          : theme.value ===
                                                              'fuchsia'
                                                            ? 'bg-fuchsia-500'
                                                            : theme.value ===
                                                                'rose'
                                                              ? 'bg-rose-500'
                                                              : 'bg-gray-500'
                    }`}
                  />
                  {theme.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className='text-xs text-muted-foreground'>
          Theme changes are applied immediately and saved to the room settings
        </div>
      </CardContent>
    </Card>
  )
}
