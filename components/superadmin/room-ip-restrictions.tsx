'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Minus, Shield, AlertTriangle } from 'lucide-react'
import { Tables } from '@/types'
import { toast } from 'sonner'

interface IPRestriction {
  id: string
  room_id: string
  allowed_ips: string[] | null
  ip_restriction_enabled: boolean | null
  created_at: string | null
  updated_at: string | null
}

interface RoomIPRestrictionsProps {
  room: Tables<'rooms'>
  onUpdated?: () => void
}

export function RoomIPRestrictions({
  room,
  onUpdated,
}: RoomIPRestrictionsProps): JSX.Element {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ipRestrictions, setIpRestrictions] = useState<IPRestriction | null>(
    null
  )
  const [newIp, setNewIp] = useState('')
  const [addingIp, setAddingIp] = useState(false)

  useEffect(() => {
    const fetchIpRestrictions = async (): Promise<void> => {
      if (!room?.id) return

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('room_ip_restrictions')
          .select('*')
          .eq('room_id', room.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          // PGRST116 is "not found" - we'll create a new record
          console.error('Error fetching IP restrictions:', error)
          return
        }

        if (data) {
          setIpRestrictions(data)
        } else {
          // Create initial record if none exists
          const { data: newRecord, error: createError } = await supabase
            .from('room_ip_restrictions')
            .insert({
              room_id: room.id,
              allowed_ips: [],
              ip_restriction_enabled: false,
            })
            .select()
            .single()

          if (createError) {
            console.error('Error creating IP restrictions record:', createError)
            return
          }

          setIpRestrictions(newRecord)
        }
      } catch (error) {
        console.error('Error fetching IP restrictions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchIpRestrictions()
  }, [room])

  const handleToggleRestriction = async (enabled: boolean): Promise<void> => {
    if (!room?.id || !ipRestrictions) return

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('room_ip_restrictions')
        .update({
          ip_restriction_enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ipRestrictions.id)

      if (error) {
        console.error('Error updating IP restriction setting:', error)
        toast.error('Failed to update IP restriction setting')
        return
      }

      setIpRestrictions((prev) =>
        prev ? { ...prev, ip_restriction_enabled: enabled } : null
      )
      toast.success(
        `IP restrictions ${enabled ? 'enabled' : 'disabled'} for ${room.name}`
      )
      onUpdated?.()
    } catch (error) {
      console.error('Error updating IP restriction setting:', error)
      toast.error('Failed to update IP restriction setting')
    } finally {
      setSaving(false)
    }
  }

  const handleAddIp = async (): Promise<void> => {
    if (!newIp.trim() || !ipRestrictions) return

    const trimmedIp = newIp.trim()
    const currentIps = ipRestrictions.allowed_ips || []

    // Check if IP already exists
    if (currentIps.includes(trimmedIp)) {
      toast.error('This IP address is already in the list')
      return
    }

    setAddingIp(true)
    try {
      const supabase = createClient()
      const updatedIps = [...currentIps, trimmedIp]

      const { error } = await supabase
        .from('room_ip_restrictions')
        .update({
          allowed_ips: updatedIps,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ipRestrictions.id)

      if (error) {
        console.error('Error adding IP address:', error)
        toast.error('Failed to add IP address')
        return
      }

      setIpRestrictions((prev) =>
        prev ? { ...prev, allowed_ips: updatedIps } : null
      )
      setNewIp('')
      toast.success('IP address added successfully')
      onUpdated?.()
    } catch (error) {
      console.error('Error adding IP address:', error)
      toast.error('Failed to add IP address')
    } finally {
      setAddingIp(false)
    }
  }

  const handleRemoveIp = async (ipToRemove: string): Promise<void> => {
    if (!ipRestrictions) return

    const currentIps = ipRestrictions.allowed_ips || []
    const updatedIps = currentIps.filter((ip) => ip !== ipToRemove)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('room_ip_restrictions')
        .update({
          allowed_ips: updatedIps,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ipRestrictions.id)

      if (error) {
        console.error('Error removing IP address:', error)
        toast.error('Failed to remove IP address')
        return
      }

      setIpRestrictions((prev) =>
        prev ? { ...prev, allowed_ips: updatedIps } : null
      )
      toast.success('IP address removed successfully')
      onUpdated?.()
    } catch (error) {
      console.error('Error removing IP address:', error)
      toast.error('Failed to remove IP address')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleAddIp()
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Shield className='h-5 w-5' />
            IP Restrictions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-8'>
            <div className='text-sm text-muted-foreground'>
              Loading IP restrictions...
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
          <Shield className='h-5 w-5' />
          IP Restrictions
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Toggle Switch */}
        <div className='flex items-center space-x-2'>
          <Switch
            id='ip_restriction_enabled'
            checked={ipRestrictions?.ip_restriction_enabled || false}
            onCheckedChange={handleToggleRestriction}
            disabled={saving}
          />
          <Label htmlFor='ip_restriction_enabled'>
            Enable IP restrictions for admin access
          </Label>
        </div>

        {/* IP List and Management */}
        {ipRestrictions?.ip_restriction_enabled && (
          <div className='space-y-4'>
            {/* Current IP List */}
            {ipRestrictions.allowed_ips &&
              ipRestrictions.allowed_ips.length > 0 && (
                <div className='space-y-2'>
                  <Label>Allowed IP Addresses</Label>
                  <div className='space-y-2'>
                    {ipRestrictions.allowed_ips.map((ip, index) => (
                      <div
                        key={index}
                        className='flex items-center justify-between p-3 border rounded-lg'
                      >
                        <span className='font-mono text-sm'>{ip}</span>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleRemoveIp(ip)}
                          className='h-8 w-8 p-0'
                        >
                          <Minus className='h-4 w-4' />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Add New IP */}
            <div className='space-y-2'>
              <Label htmlFor='new_ip'>Add IP Address</Label>
              <div className='flex gap-2'>
                <Input
                  id='new_ip'
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder='192.168.1.1 or 192.168.1.0/24'
                  className='flex-1'
                />
                <Button
                  onClick={handleAddIp}
                  disabled={!newIp.trim() || addingIp}
                  size='sm'
                >
                  <Plus className='h-4 w-4 mr-2' />
                  {addingIp ? 'Adding...' : 'Add'}
                </Button>
              </div>
              <p className='text-sm text-muted-foreground'>
                Enter individual IP addresses or CIDR ranges (e.g.,
                192.168.1.0/24)
              </p>
            </div>

            <Alert>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>
                <div className='space-y-1'>
                  <p className='font-medium'>Important Security Note:</p>
                  <p className='text-sm'>
                    IP restrictions only apply to admin routes. Players can
                    still access the room from any IP address. Make sure to test
                    your IP restrictions before enabling them in production.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {ipRestrictions?.ip_restriction_enabled &&
          (!ipRestrictions.allowed_ips ||
            ipRestrictions.allowed_ips.length === 0) && (
            <div className='text-center py-8 text-muted-foreground'>
              <p>
                No IP addresses configured. Add IP addresses above to restrict
                admin access.
              </p>
            </div>
          )}
      </CardContent>
    </Card>
  )
}
