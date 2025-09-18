import { Suspense } from 'react'
import { OperatorSignInForm } from '@/components/forms/operator-signin-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Sign In | DeepStack',
  description: 'Sign in to access poker room administration features.',
}

export default function AdminSignInPage(): JSX.Element {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OperatorSignInForm
        title='Admin Sign In'
        description='Sign in to access the admin dashboard'
        role='admin'
        showIpRestriction={true}
      />
    </Suspense>
  )
}
