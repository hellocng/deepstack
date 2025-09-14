'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, UserPlus } from 'lucide-react'

interface AddFriendDialogProps {
  children: React.ReactNode
}

export function AddFriendDialog({
  children,
}: AddFriendDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; alias: string; avatar: string | null }>
  >([])

  const handleSearch = async (): Promise<void> => {
    // This would search for players in a real implementation
    // For now, we'll show placeholder results
    setSearchResults([
      { id: '1', alias: 'Alice', avatar: null },
      { id: '2', alias: 'Bob', avatar: null },
      { id: '3', alias: 'Charlie', avatar: null },
    ])
  }

  const handleAddFriend = async (_playerId: string): Promise<void> => {
    // This would send a friend request in a real implementation
    // Adding friend
    setIsOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }

  if (!isOpen) {
    return <div onClick={() => setIsOpen(true)}>{children}</div>
  }

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <Card className='w-full max-w-md mx-4'>
        <CardHeader>
          <CardTitle className='flex items-center space-x-2'>
            <UserPlus className='h-5 w-5' />
            <span>Add Friend</span>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='search'>Search by alias or phone number</Label>
            <div className='flex space-x-2'>
              <Input
                id='search'
                placeholder='Enter player alias...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button
                onClick={handleSearch}
                size='sm'
              >
                <Search className='h-4 w-4' />
              </Button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className='space-y-2'>
              <Label>Search Results</Label>
              <div className='space-y-2 max-h-48 overflow-y-auto'>
                {searchResults.map((player) => (
                  <div
                    key={player.id}
                    className='flex items-center justify-between p-2 border rounded'
                  >
                    <div className='flex items-center space-x-2'>
                      <div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center'>
                        <span className='text-sm font-medium'>
                          {player.alias.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className='text-sm font-medium'>
                        {player.alias}
                      </span>
                    </div>
                    <Button
                      size='sm'
                      onClick={() => handleAddFriend(player.id)}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className='flex space-x-2 pt-4'>
            <Button
              variant='outline'
              className='flex-1'
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
