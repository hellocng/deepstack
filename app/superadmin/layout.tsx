'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser, useSuperAdmin } from '@/lib/auth/user-context'
import { Loading } from '@/components/ui/loading'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}): JSX.Element | null {
  const { loading } = useUser()
  const superAdmin = useSuperAdmin()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't redirect if on signin page
    if (pathname === '/superadmin/signin') {
      return
    }

    if (!loading && !superAdmin) {
      router.push('/superadmin/signin')
    }
  }, [loading, superAdmin, router, pathname])

  // Don't wrap signin page with SuperAdminLayout
  if (pathname === '/superadmin/signin') {
    return <>{children}</>
  }

  if (loading) {
    return (
      <Loading
        fullScreen
        size='md'
        text='Loading...'
      />
    )
  }

  // Don't render anything if not a superadmin (redirect will happen in useEffect)
  if (!superAdmin) {
    return null
  }

  return <>{children}</>
}
