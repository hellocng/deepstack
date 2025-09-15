import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Profile | DeepStack',
  description:
    'Manage your profile settings, preferences, and account information.',
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  return <>{children}</>
}
