import { AdminTournamentsPage } from '@/components/admin/admin-tournaments-page'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tournaments Management | DeepStack',
  description: 'Create and manage poker tournaments in your room.',
}

export default function TournamentsPage(): JSX.Element {
  return <AdminTournamentsPage />
}
