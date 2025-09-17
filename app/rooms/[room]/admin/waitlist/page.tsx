import { AdminWaitlistPage } from '@/components/admin/admin-waitlist-page'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Waitlist Management | DeepStack',
  description: 'Manage player waitlists and game assignments.',
}

export default function WaitlistPage(): JSX.Element {
  return <AdminWaitlistPage />
}
