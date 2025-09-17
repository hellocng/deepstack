'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { useUser, usePlayer, useSuperAdmin } from '@/lib/auth/user-context'
import { useRouter, usePathname } from 'next/navigation'
import { formatPhoneNumber } from '@/lib/utils'
import { Laptop, Moon, Sun, User } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { PWAInstall } from '@/components/pwa-install'

export function Navigation(): JSX.Element {
  const { user, authUser, loading, signOut } = useUser()
  const _player = usePlayer()
  const superAdmin = useSuperAdmin()
  const router = useRouter()
  const pathname = usePathname()
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [mounted, setMounted] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  // Navigation renders successfully

  // Handle hydration - simplified
  useEffect(() => {
    setMounted(true)

    // Initialize theme on mount
    const savedTheme = localStorage.getItem('theme') as
      | 'light'
      | 'dark'
      | 'system'
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement
    const currentTheme = root.classList.contains('dark') ? 'dark' : 'light'
    let newTheme: string

    if (theme === 'system') {
      newTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      localStorage.setItem('theme', 'system')
    } else {
      newTheme = theme
      localStorage.setItem('theme', theme)
    }

    // Only update if the theme actually changed
    if (newTheme !== currentTheme) {
      root.classList.remove('light', 'dark')
      root.classList.add(newTheme)
    }
  }, [theme, mounted])

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted || theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (): void => {
      const root = window.document.documentElement
      const newTheme = mediaQuery.matches ? 'dark' : 'light'
      const currentTheme = root.classList.contains('dark') ? 'dark' : 'light'

      // Only update if the theme actually changed
      if (newTheme !== currentTheme) {
        root.classList.remove('light', 'dark')
        root.classList.add(newTheme)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return (): void => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, mounted])

  const handleSignIn = (): void => {
    router.push('/signin')
  }

  const handleProfile = (): void => {
    if (
      user?.type === 'operator' &&
      (user.profile.role as string) === 'superadmin'
    ) {
      router.push('/superadmin')
    } else {
      router.push('/profile')
    }
  }

  const handleSignOut = async (): Promise<void> => {
    try {
      setIsSigningOut(true)
      await signOut()
    } catch (_error) {
      setIsSigningOut(false)
      alert('Failed to sign out. Please try again or refresh the page.')
    }
  }

  const handleLogoClick = (): void => {
    router.push('/')
  }

  const isSignInPage =
    pathname === '/signin' ||
    pathname === '/admin/signin' ||
    pathname === '/superadmin/signin'
  const isRootPage = pathname === '/'
  const _shouldShowSignIn = !isSignInPage && !user

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
              {/* No skeleton during hydration - wait for mount */}
            </div>
          </div>
        </div>
      </nav>
    )
  }

  const formatRoleLabel = (role?: string | null): string => {
    if (!role) return 'Operator'
    if (role === 'superadmin') return 'Super Admin'
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  const isOperator = user?.type === 'operator'
  const operatorRole = isOperator ? (user.profile.role as string) : null
  const isSuperAdmin = !!superAdmin

  const getPrimaryLabel = (): string => {
    if (!user) return ''
    if (user.type === 'player') {
      return user.profile.alias || 'No alias set'
    }

    if (isSuperAdmin) {
      return 'Super Admin'
    }

    return user.room?.name || 'Operator'
  }

  const getSecondaryLabel = (): string => {
    if (!user) return ''
    if (user.type === 'player') {
      return formatPhoneNumber(user.phoneNumber || '')
    }

    if (isSuperAdmin) {
      return authUser?.email || 'Email unavailable'
    }

    return formatRoleLabel(operatorRole)
  }

  const primaryLabel = getPrimaryLabel()
  const secondaryLabel = getSecondaryLabel()

  const avatarFallbackInitial = primaryLabel.trim().charAt(0).toUpperCase() || '?'
  const avatarUrl = user?.profile.avatar_url || null
  const avatarAlt = primaryLabel ? `${primaryLabel} avatar` : 'User avatar'

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
            {!isSignInPage && !loading && (
              <>
                {user ? (
                  <>
                    <PWAInstall />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='ghost'
                          className='relative h-8 w-8 rounded-full'
                        >
                          <Avatar className='h-8 w-8'>
                            {avatarUrl ? (
                              <AvatarImage
                                src={avatarUrl}
                                alt={avatarAlt}
                              />
                            ) : null}
                            <AvatarFallback className='text-sm font-medium'>
                              {avatarFallbackInitial || '?'}
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
                              {primaryLabel}
                            </p>
                            <p className='text-xs leading-none text-muted-foreground mt-4'>
                              {secondaryLabel}
                            </p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleProfile}>
                          <User className='mr-2 h-4 w-4' />
                          {user.type === 'operator' &&
                          (user.profile.role as string) === 'superadmin'
                            ? 'Admin Panel'
                            : 'Profile'}
                        </DropdownMenuItem>
                        {user.type === 'player' && (
                          <>
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
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault()
                            handleSignOut()
                          }}
                          disabled={isSigningOut}
                        >
                          {isSigningOut ? 'Signing out...' : 'Sign out'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
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
