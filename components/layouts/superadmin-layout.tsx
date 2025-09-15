'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, useSuperAdmin } from '@/lib/auth/user-context'

interface SuperAdminLayoutProps {
  children: React.ReactNode
}

export function SuperAdminLayout({
  children,
}: SuperAdminLayoutProps): JSX.Element {
  const { loading } = useUser()
  const superAdmin = useSuperAdmin()

  const router = useRouter()

  useEffect(() => {
    if (!loading && !superAdmin) {
      router.push('/superadmin/signin')
    }
  }, [loading, superAdmin, router])

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

  // Don't render anything if not a superadmin (redirect will happen in useEffect)
  if (!superAdmin) {
    return null
  }

  return <>{children}</>
}
