'use client'

import { useRouter } from 'next/navigation'
import { useUser, useOperator } from '@/lib/auth/user-context'
import { Loading } from '@/components/ui/loading'

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
      <Loading
        fullScreen
        size='md'
        text='Loading...'
      />
    )
  }

  return (
    <div className='min-h-screen bg-background'>
      <main className='w-full max-w-7xl mx-auto px-4 py-6'>{children}</main>
    </div>
  )
}
