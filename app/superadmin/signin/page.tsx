import { OperatorSignInForm } from '@/components/forms/operator-signin-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Super Admin Sign In | DeepStack',
  description: 'Sign in to access super admin features and system management.',
}

export default function SuperAdminSignInPage(): JSX.Element {
  return (
    <OperatorSignInForm
      title='Super Admin Sign In'
      description='Sign in to access super admin features and system management'
      role='superadmin'
      redirectPath='/superadmin'
    />
  )
}
