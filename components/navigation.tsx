'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { usePlayerAuth } from '@/lib/auth/player-auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { formatPhoneNumber } from '@/lib/utils'
import { Laptop, Moon, Sun, User } from 'lucide-react'
import { useState, useEffect } from 'react'

export function Navigation(): JSX.Element {
  const { player, loading, signOut } = usePlayerAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [mounted, setMounted] = useState(false)

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize theme on mount
  useEffect(() => {
    if (!mounted) return

    const savedTheme = localStorage.getItem('theme') as
      | 'light'
      | 'dark'
      | 'system'
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [mounted])

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'
      root.classList.remove('light', 'dark')
      root.classList.add(systemTheme)
      localStorage.setItem('theme', 'system')
    } else {
      root.classList.remove('light', 'dark')
      root.classList.add(theme)
      localStorage.setItem('theme', theme)
    }
  }, [theme, mounted])

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted || theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (): void => {
      const root = window.document.documentElement
      const newTheme = mediaQuery.matches ? 'dark' : 'light'
      root.classList.remove('light', 'dark')
      root.classList.add(newTheme)
    }

    mediaQuery.addEventListener('change', handleChange)
    return (): void => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, mounted])

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
  const isRootPage = pathname === '/'

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <nav className='w-full fixed top-0 left-0 right-0 z-50 border-b border-border bg-transparent'>
        <div className='w-full flex justify-center bg-background/90 backdrop-blur-sm'>
          <div className='h-16 w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm'>
            <div className='flex items-center'>
              {!isRootPage && (
                <button
                  onClick={handleLogoClick}
                  className='font-semibold text-foreground hover:text-primary transition-colors cursor-pointer'
                >
                  DeepStack
                </button>
              )}
            </div>
            <div className='flex items-center gap-4'>
              {!isSignInPage && (
                <div className='w-8 h-8 rounded-full bg-muted animate-pulse' />
              )}
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className='w-full fixed top-0 left-0 right-0 z-50 border-b border-border bg-transparent'>
      <div className='w-full flex justify-center bg-background/90 backdrop-blur-sm'>
        <div className='h-16 w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm'>
          <div className='flex items-center'>
            {!isRootPage && (
              <button
                onClick={handleLogoClick}
                className='font-semibold text-foreground hover:text-primary transition-colors cursor-pointer'
              >
                DeepStack
              </button>
            )}
          </div>
          <div className='flex items-center gap-4'>
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
                      <DropdownMenuLabel className='font-normal'>
                        <div className='flex flex-col'>
                          <p className='text-sm font-medium leading-none'>
                            {player.alias || 'No alias set'}
                          </p>
                          <p className='text-xs leading-none text-muted-foreground mt-4'>
                            {formatPhoneNumber(player.phone_number || '')}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleProfile}>
                        <User className='mr-2 h-4 w-4' />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Theme</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={theme}
                        onValueChange={(value) =>
                          setTheme(value as 'light' | 'dark' | 'system')
                        }
                      >
                        <DropdownMenuRadioItem
                          className='flex gap-2'
                          value='light'
                        >
                          <Sun
                            size={16}
                            className='text-muted-foreground'
                          />
                          <span>Light</span>
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem
                          className='flex gap-2'
                          value='dark'
                        >
                          <Moon
                            size={16}
                            className='text-muted-foreground'
                          />
                          <span>Dark</span>
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem
                          className='flex gap-2'
                          value='system'
                        >
                          <Laptop
                            size={16}
                            className='text-muted-foreground'
                          />
                          <span>System</span>
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleSignIn}
                  >
                    Sign In
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
