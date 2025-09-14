'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Player } from '@/types'
import { User, Save, Edit } from 'lucide-react'

interface ProfileFormProps {
  player: Player
}

export function ProfileForm({ player }: ProfileFormProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    alias: player.alias || '',
    email: player.email || '',
    phone_number: player.phone_number || '',
  })

  const handleSave = async () => {
    // This would update the player profile in a real implementation
    console.log('Saving profile:', formData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setFormData({
      alias: player.alias || '',
      email: player.email || '',
      phone_number: player.phone_number || '',
    })
    setIsEditing(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center space-x-2'>
          <User className='h-5 w-5' />
          <span>Profile Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Avatar Section */}
        <div className='flex items-center space-x-4'>
          <Avatar className='h-20 w-20'>
            <AvatarImage src={player.avatar_url} />
            <AvatarFallback className='text-lg'>
              {player.alias?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className='text-lg font-medium'>{player.alias}</h3>
            <p className='text-sm text-muted-foreground'>
              Member since{' '}
              {new Date(player.created_at || '').toLocaleDateString()}
            </p>
            {isEditing && (
              <Button
                variant='outline'
                size='sm'
                className='mt-2'
              >
                Change Avatar
              </Button>
            )}
          </div>
        </div>

        {/* Form Fields */}
        <div className='grid gap-4'>
          <div className='space-y-2'>
            <Label htmlFor='alias'>Alias</Label>
            <Input
              id='alias'
              value={formData.alias}
              onChange={(e) =>
                setFormData({ ...formData, alias: e.target.value })
              }
              disabled={!isEditing}
              placeholder='Enter your alias'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              type='email'
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              disabled={!isEditing}
              placeholder='Enter your email'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='phone'>Phone Number</Label>
            <Input
              id='phone'
              type='tel'
              value={formData.phone_number}
              onChange={(e) =>
                setFormData({ ...formData, phone_number: e.target.value })
              }
              disabled={!isEditing}
              placeholder='Enter your phone number'
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className='flex space-x-2'>
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                className='flex-1'
              >
                <Save className='h-4 w-4 mr-2' />
                Save Changes
              </Button>
              <Button
                variant='outline'
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              className='flex-1'
            >
              <Edit className='h-4 w-4 mr-2' />
              Edit Profile
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
