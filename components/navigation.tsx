'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { usePlayerAuth } from '@/lib/auth/player-auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { formatPhoneNumber } from '@/lib/utils'

export function Navigation(): JSX.Element {
  const { player, loading, signOut } = usePlayerAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleSignIn = (): void => {
    router.push('/signin')
  }

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut()
      router.push('/')
    } catch (_error) {
      // Error signing out
      // You could add a toast notification here if you have a toast system
    }
  }

  const handleProfile = (): void => {
    router.push('/profile')
  }

  const handleLogoClick = (): void => {
    router.push('/')
  }

  const isSignInPage = pathname === '/signin'

  return (
    <header className='container mx-auto px-4 py-6'>
      <div className='flex items-center justify-between'>
        <div>
          <button
            onClick={handleLogoClick}
            className='text-2xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer'
          >
            DeepStack
          </button>
        </div>
        <div className='flex items-center space-x-2'>
          <ThemeToggle />
          {!isSignInPage && (
            <>
              {loading ? (
                <div className='w-8 h-8 rounded-full bg-muted animate-pulse' />
              ) : player ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      className='relative h-8 w-8 rounded-full'
                    >
                      <Avatar className='h-8 w-8'>
                        <AvatarFallback className='text-sm font-medium'>
                          {player.alias
                            ? player.alias.charAt(0).toUpperCase()
                            : '?'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className='w-56'
                    align='end'
                    forceMount
                  >
                    <div className='flex items-center justify-start gap-2 p-2'>
                      <div className='flex flex-col space-y-2 leading-none'>
                        <p className='font-medium'>
                          {player.alias || 'No alias set'}
                        </p>
                        <p className='w-[200px] truncate text-sm text-muted-foreground'>
                          {formatPhoneNumber(player.phone_number || '')}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleProfile}>
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant='outline'
                  onClick={handleSignIn}
                >
                  Sign In
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  )
}
