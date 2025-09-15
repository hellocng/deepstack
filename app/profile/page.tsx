'use client'

import { useState, useEffect } from 'react'
import { usePlayer, useUser } from '@/lib/auth/user-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User } from 'lucide-react'
import { ThemeSettings } from '@/components/theme-settings'

export default function ProfilePage(): JSX.Element {
  const player = usePlayer()
  const { refreshUser } = useUser()
  const loading = !player
  const router = useRouter()
  const [alias, setAlias] = useState(player?.profile.alias || '')
  const [originalAlias, setOriginalAlias] = useState(
    player?.profile.alias || ''
  )
  const [saving, setSaving] = useState(false)

  // Update alias state when player data loads
  useEffect(() => {
    if (player?.profile.alias) {
      setAlias(player.profile.alias)
      setOriginalAlias(player.profile.alias)
    }
  }, [player?.profile.alias])

  const handleSaveAlias = async (): Promise<void> => {
    if (!player) return

    setSaving(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { error } = await supabase
        .from('players')
        .update({ alias: alias.trim() })
        .eq('id', player.profile.id)

      if (error) {
        // Error saving alias - you could add a toast notification here
        return
      }

      // Update the local state
      setOriginalAlias(alias)
      // Refresh user data to get the latest profile
      await refreshUser()
      // You could add a success toast notification here
    } catch (_error) {
      // Error saving alias - you could add an error toast notification here
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = (): void => {
    setAlias(originalAlias)
  }

  const hasChanges = alias !== originalAlias

  if (loading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='max-w-2xl mx-auto'>
          <div className='animate-pulse space-y-4'>
            <div className='h-8 bg-muted rounded w-1/3'></div>
            <div className='h-32 bg-muted rounded'></div>
          </div>
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='max-w-2xl mx-auto text-center'>
          <h1 className='text-2xl font-bold mb-4'>Not signed in</h1>
          <p className='text-muted-foreground mb-4'>
            Please sign in to view your profile.
          </p>
          <Button onClick={() => router.push('/signin')}>Sign In</Button>
        </div>
      </div>
    )
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='max-w-2xl mx-auto space-y-6'>
        {/* Header with Back Button */}
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={() => router.back()}
            aria-label='Back'
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Profile</h1>
            <p className='text-muted-foreground'>
              Manage your account settings
            </p>
          </div>
        </div>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <User className='h-5 w-5' />
              <span>Profile Information</span>
            </CardTitle>
            <CardDescription>Update your profile details</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Phone Number (Read-only) */}
            <div className='space-y-2'>
              <Label htmlFor='phone'>Phone Number</Label>
              <Input
                id='phone'
                value={player.phoneNumber || ''}
                disabled
                className='bg-muted'
              />
              <p className='text-sm text-muted-foreground'>
                Your phone number is not visible to other players.
              </p>
            </div>

            <Separator />

            {/* Alias (Editable) */}
            <div className='space-y-2'>
              <Label htmlFor='alias'>Alias</Label>
              <Input
                id='alias'
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder='Enter your alias'
                maxLength={20}
              />
              <div className='flex items-center justify-between'>
                <p className='text-sm text-muted-foreground'>
                  Your alias is how other players will see you
                </p>
                {hasChanges && (
                  <div className='flex space-x-2'>
                    <Button
                      size='sm'
                      onClick={handleSaveAlias}
                      disabled={saving || !alias.trim()}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <ThemeSettings
          player={player.profile}
          onThemeChange={(_theme) => {
            // Theme change is handled by the ThemeSettings component
            // This callback can be used for additional actions if needed
          }}
        />
      </div>
    </div>
  )
}
