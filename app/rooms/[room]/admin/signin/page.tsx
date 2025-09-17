import { Suspense } from 'react'
import { AdminSignInForm } from '@/components/forms/admin-signin-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Sign In | DeepStack',
  description: 'Sign in to access poker room administration features.',
}

export default function AdminSignInPage(): JSX.Element {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminSignInForm />
    </Suspense>
  )
}
