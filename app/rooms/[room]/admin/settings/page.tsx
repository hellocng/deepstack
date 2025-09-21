'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOperator } from '@/lib/auth/user-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { OperatorThemeSettings } from '@/components/operator-theme-settings'

interface RoomSettings {
  id?: string
  room_id: string
  call_in_expiry_minutes: number | null
  notify_expiry_minutes: number | null
  created_at?: string | null
  updated_at?: string | null
}

export default function SettingsPage(): JSX.Element {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    room_id: '',
    call_in_expiry_minutes: null,
    notify_expiry_minutes: null,
  })
  const [originalSettings, setOriginalSettings] = useState<RoomSettings>({
    room_id: '',
    call_in_expiry_minutes: null,
    notify_expiry_minutes: null,
  })
  const [callInExpiry, setCallInExpiry] = useState('')
  const [notifyExpiry, setNotifyExpiry] = useState('')
  const operator = useOperator()
  const router = useRouter()

  useEffect(() => {
    const fetchRoomSettings = async (): Promise<void> => {
      if (!operator?.profile?.room_id) return

      try {
        const supabase = createClient()

        const { data: settings, error } = await supabase
          .from('room_settings')
          .select('*')
          .eq('room_id', operator.profile.room_id)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            // Record not found - create a new one
            const { data: newRecord, error: createError } = await supabase
              .from('room_settings')
              .insert({
                room_id: operator.profile.room_id,
                call_in_expiry_minutes: null,
                notify_expiry_minutes: null,
              })
              .select()
              .single()

            if (createError) {
              console.error('Error creating room settings record:', createError)
              return
            }

            setRoomSettings(newRecord)
            setOriginalSettings(newRecord)
            setCallInExpiry('')
            setNotifyExpiry('')
          } else {
            console.error('Error fetching room settings:', error)
            return
          }
        } else if (settings) {
          setRoomSettings(settings)
          setOriginalSettings(settings)
          setCallInExpiry(settings.call_in_expiry_minutes?.toString() || '')
          setNotifyExpiry(settings.notify_expiry_minutes?.toString() || '')
        }
      } catch (error) {
        console.error('Error fetching room settings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRoomSettings()
  }, [operator])

  const handleSaveExpirySettings = async (): Promise<void> => {
    if (!operator?.profile?.room_id || !roomSettings.id) return

    setSaving(true)
    try {
      const supabase = createClient()
      const callInMinutes = callInExpiry ? parseInt(callInExpiry, 10) : null
      const notifyMinutes = notifyExpiry ? parseInt(notifyExpiry, 10) : null

      // Validate inputs
      if (
        callInMinutes !== null &&
        (isNaN(callInMinutes) || callInMinutes < 1)
      ) {
        toast.error('Call in expiry must be a positive number')
        return
      }
      if (
        notifyMinutes !== null &&
        (isNaN(notifyMinutes) || notifyMinutes < 1)
      ) {
        toast.error('Notify expiry must be a positive number')
        return
      }

      const { error } = await supabase
        .from('room_settings')
        .update({
          call_in_expiry_minutes: callInMinutes,
          notify_expiry_minutes: notifyMinutes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roomSettings.id)

      if (error) {
        console.error('Error updating room settings:', error)
        toast.error('Failed to update settings')
        return
      }

      const newSettings: RoomSettings = {
        ...roomSettings,
        call_in_expiry_minutes: callInMinutes,
        notify_expiry_minutes: notifyMinutes,
      }

      setRoomSettings(newSettings)
      setOriginalSettings(newSettings)
      toast.success('Settings updated successfully')
    } catch (error) {
      console.error('Error updating room settings:', error)
      toast.error('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelExpirySettings = (): void => {
    setCallInExpiry(originalSettings.call_in_expiry_minutes?.toString() || '')
    setNotifyExpiry(originalSettings.notify_expiry_minutes?.toString() || '')
  }

  const isExpirySettingsDirty = (): boolean => {
    const originalCallIn =
      originalSettings.call_in_expiry_minutes?.toString() || ''
    const originalNotify =
      originalSettings.notify_expiry_minutes?.toString() || ''
    return callInExpiry !== originalCallIn || notifyExpiry !== originalNotify
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-sm text-muted-foreground'>Loading settings...</div>
      </div>
    )
  }

  // Check if user is authenticated as an operator with admin role
  if (!operator) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center'>
          <h2 className='text-xl font-semibold mb-2'>Access Denied</h2>
          <p className='text-muted-foreground mb-4'>
            You must be logged in as a room administrator to access settings.
          </p>
          <Button onClick={() => router.push('/')}>Go to Home</Button>
        </div>
      </div>
    )
  }

  if (operator.profile.role !== 'admin') {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center'>
          <h2 className='text-xl font-semibold mb-2'>
            Insufficient Permissions
          </h2>
          <p className='text-muted-foreground mb-4'>
            You must have admin role to access settings. Current role:{' '}
            {operator.profile.role}
          </p>
          <Button onClick={() => router.push('/')}>Go to Home</Button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header with back button */}
      <div className='flex items-center gap-4'>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8'
          onClick={() => router.back()}
        >
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <h1 className='text-3xl font-bold tracking-tight'>Settings</h1>
      </div>

      <div className='space-y-6'>
        {/* Theme Settings */}
        <OperatorThemeSettings
          onThemeChange={() => {
            // Theme change is handled automatically by the OperatorThemeSettings component
          }}
        />

        {/* Expiry Settings */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Clock className='h-5 w-5' />
              Expiry Settings
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='call_in_expiry'>Call In Expiry (minutes)</Label>
                <Input
                  id='call_in_expiry'
                  type='number'
                  min='1'
                  value={callInExpiry}
                  onChange={(e) => setCallInExpiry(e.target.value)}
                  placeholder='Enter minutes'
                />
                <p className='text-sm text-muted-foreground'>
                  How long players have to call in after being notified
                </p>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='notify_expiry'>Notify Expiry (minutes)</Label>
                <Input
                  id='notify_expiry'
                  type='number'
                  min='1'
                  value={notifyExpiry}
                  onChange={(e) => setNotifyExpiry(e.target.value)}
                  placeholder='Enter minutes'
                />
                <p className='text-sm text-muted-foreground'>
                  How long to wait before notifying the next player
                </p>
              </div>
            </div>

            {/* Save/Cancel buttons - only show when dirty */}
            {isExpirySettingsDirty() && (
              <div className='flex gap-2 pt-4 border-t'>
                <Button
                  onClick={handleSaveExpirySettings}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant='outline'
                  onClick={handleCancelExpirySettings}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
