'use client'

import { Button } from '@/components/ui/button'
import { User, LogOut, Bell } from 'lucide-react'
import { Room } from '@/types'
import Link from 'next/link'
import Image from 'next/image'

interface RoomHeaderProps {
  room: Room
}

export function RoomHeader({ room }: RoomHeaderProps): JSX.Element {
  return (
    <header className='border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='w-full max-w-7xl mx-auto px-4'>
        <div className='flex h-16 items-center justify-between'>
          {/* Logo and Room Info */}
          <div className='flex items-center space-x-4'>
            <Link
              href={`/${room.code}`}
              className='flex items-center space-x-2'
            >
              {room.logo_url ? (
                <Image
                  src={room.logo_url}
                  alt={room.name}
                  width={32}
                  height={32}
                  className='h-8 w-8 rounded'
                />
              ) : (
                <div className='h-8 w-8 rounded bg-primary flex items-center justify-center'>
                  <span className='text-primary-foreground font-bold text-sm'>
                    {room.name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h1 className='font-bold text-lg'>{room.name}</h1>
                <p className='text-xs text-muted-foreground'>{room.code}</p>
              </div>
            </Link>
          </div>

          {/* Right side actions */}
          <div className='flex items-center space-x-2'>
            <Button
              variant='ghost'
              size='sm'
            >
              <Bell className='h-4 w-4' />
            </Button>
            <Button
              variant='ghost'
              size='sm'
            >
              <User className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='sm'
            >
              <LogOut className='h-4 w-4 mr-2' />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
