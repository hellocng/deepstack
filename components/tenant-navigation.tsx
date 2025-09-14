'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, Gamepad2, Users, Clock, User } from 'lucide-react'
import { Tenant } from '@/types'

interface TenantNavigationProps {
  tenant: Tenant
}

const navigation = [
  {
    name: 'Dashboard',
    href: '',
    icon: Home,
  },
  {
    name: 'Games',
    href: '/games',
    icon: Gamepad2,
  },
  {
    name: 'Waitlist',
    href: '/waitlist',
    icon: Clock,
  },
  {
    name: 'Friends',
    href: '/friends',
    icon: Users,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
  },
]

export function TenantNavigation({
  tenant,
}: TenantNavigationProps): JSX.Element {
  const pathname = usePathname()
  const basePath = `/${tenant.code}`

  return (
    <nav className='border-b bg-background'>
      <div className='container mx-auto px-4'>
        <div className='flex space-x-8'>
          {navigation.map((item) => {
            const href = `${basePath}${item.href}`
            const isActive =
              pathname === href ||
              (item.href !== '' && pathname.startsWith(href))

            return (
              <Link
                key={item.name}
                href={href}
                className={cn(
                  'flex items-center space-x-2 py-4 text-sm font-medium transition-colors hover:text-primary',
                  isActive
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className='h-4 w-4' />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
