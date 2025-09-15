import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Poker Rooms | DeepStack',
  description:
    'Browse all available poker rooms, see active games, and check waitlist status.',
}

export default function RoomsLayout({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  return <>{children}</>
}
