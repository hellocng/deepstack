'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser, useOperator } from '@/lib/auth/user-context'
import { Loading } from '@/components/ui/loading'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}): JSX.Element | null {
  const { loading, authUser, user } = useUser()
  const operator = useOperator()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  // Check if we're on the signin page (/admin/signin)
  const isSigninPage = pathname?.endsWith('/admin/signin')

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || loading) return

    if (isSigninPage) {
      if (operator) {
        router.replace('/admin')
      }
      return
    }

    if (!authUser && !user) {
      router.replace('/admin/signin')
      return
    }

    if (user && user.type !== 'operator') {
      router.replace('/rooms')
    }
  }, [
    authUser,
    isSigninPage,
    loading,
    mounted,
    operator,
    router,
    user,
  ])

  if (!mounted || (loading && !isSigninPage)) {
    return (
      <Loading
        fullScreen
        size='md'
        text='Loading...'
      />
    )
  }

  // If we're on the signin page, always render children
  if (isSigninPage) {
    return <>{children}</>
  }

  // For other admin pages, require operator authentication
  if (!operator) {
    return null
  }

  return (
    <div className='min-h-screen bg-background'>
      <main className='w-full max-w-7xl mx-auto px-4 py-6'>{children}</main>
    </div>
  )
}
