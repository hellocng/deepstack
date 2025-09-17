'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  const params = useParams<{ room?: string }>()
  const [mounted, setMounted] = useState(false)
  const roomSlug = params?.room ?? ''

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || loading) return
    if (!operator) {
      const fallback = roomSlug ? `/${roomSlug}/admin/signin` : '/signin'
      router.replace(fallback)
    }
  }, [loading, mounted, operator, roomSlug, router])

  if (!mounted || loading) {
    return (
      <Loading
        fullScreen
        size='md'
        text='Loading...'
      />
    )
  }

  if (!operator) {
    return null
  }

  return (
    <div className='min-h-screen bg-background'>
      <main className='w-full max-w-7xl mx-auto px-4 py-6'>{children}</main>
    </div>
  )
}
