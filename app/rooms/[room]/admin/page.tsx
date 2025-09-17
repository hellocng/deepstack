import { AdminDashboard } from '@/components/admin/admin-dashboard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Dashboard | DeepStack',
  description:
    'Manage your poker room operations, games, tables, and waitlists.',
}

export default function AdminPage(): JSX.Element {
  return <AdminDashboard />
}
