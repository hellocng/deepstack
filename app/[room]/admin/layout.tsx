'use client'

import { useRouter } from 'next/navigation'
import { useUser, useOperator } from '@/lib/auth/user-context'
import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}): JSX.Element | null {
  const { loading } = useUser()
  const operator = useOperator()
  const router = useRouter()

  // Redirect if not an operator
  if (!loading && !operator) {
    router.push('/admin/signin')
    return null
  }

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-muted-foreground'>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-background'>
      <header className='border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='w-full max-w-7xl mx-auto px-4 flex h-14 items-center'>
          <div className='mr-4 flex'>
            <Link
              className='mr-6 flex items-center space-x-2'
              href='/admin'
            >
              <span className='font-bold'>Admin</span>
            </Link>
            <nav className='flex items-center space-x-6 text-sm font-medium'>
              <Link
                className='transition-colors hover:text-foreground/80 text-foreground/60'
                href='/admin'
              >
                Dashboard
              </Link>
              <Link
                className='transition-colors hover:text-foreground/80 text-foreground/60'
                href='/admin/games'
              >
                Games
              </Link>
              <Link
                className='transition-colors hover:text-foreground/80 text-foreground/60'
                href='/admin/tables'
              >
                Tables
              </Link>
              <Link
                className='transition-colors hover:text-foreground/80 text-foreground/60'
                href='/admin/tournaments'
              >
                Tournaments
              </Link>
              <Link
                className='transition-colors hover:text-foreground/80 text-foreground/60'
                href='/admin/waitlist'
              >
                Waitlist
              </Link>
            </nav>
          </div>
          <div className='ml-auto flex items-center space-x-4'>
            <span className='text-sm text-muted-foreground'>
              {operator?.profile.first_name} {operator?.profile.last_name}
            </span>
            <span className='text-xs text-muted-foreground bg-muted px-2 py-1 rounded'>
              {operator?.profile.role}
            </span>
            <button
              onClick={() => router.push('/')}
              className='text-sm text-muted-foreground hover:text-foreground'
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <main className='w-full max-w-7xl mx-auto px-4 py-6'>{children}</main>
    </div>
  )
}
