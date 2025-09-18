'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
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
  const params = useParams<{ room?: string }>()
  const [mounted, setMounted] = useState(false)
  const roomSlug = params?.room ?? ''

  // Check if we're on the signin page
  const isSigninPage = pathname?.endsWith('/admin/signin')

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || loading) return

    if (isSigninPage) {
      if (operator) {
        const destination = roomSlug
          ? `/rooms/${roomSlug}/admin`
          : '/rooms'
        router.replace(destination)
      }
      return
    }

    if (!authUser) {
      const fallback = roomSlug ? `/rooms/${roomSlug}/admin/signin` : '/signin'
      router.replace(fallback)
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
    roomSlug,
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
