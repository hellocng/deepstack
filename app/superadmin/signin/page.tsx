import { SuperAdminSignInForm } from '@/components/forms/superadmin-signin-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Super Admin Sign In | DeepStack',
  description: 'Sign in to access super admin features and system management.',
}

export default function SuperAdminSignInPage(): JSX.Element {
  return <SuperAdminSignInForm />
}
