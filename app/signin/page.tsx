import { SignInForm } from '@/components/forms/signin-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | DeepStack',
  description:
    'Sign in to your DeepStack account to access poker rooms and games.',
}

export default function SignInPage(): JSX.Element {
  return <SignInForm />
}
