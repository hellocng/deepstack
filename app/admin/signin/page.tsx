import { OperatorSignInForm } from '@/components/forms/operator-signin-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Sign In | DeepStack',
  description: 'Sign in to access room administration features.',
}

export default function AdminSignInPage(): JSX.Element {
  return (
    <OperatorSignInForm
      title='Admin Sign In'
      description='Sign in to manage your room'
      role='operator'
      redirectPath='/admin'
    />
  )
}


