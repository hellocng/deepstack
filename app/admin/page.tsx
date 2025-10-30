import { AdminConsole } from '@/components/admin/admin-console'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Console | DeepStack',
  description:
    'Manage your poker room operations, games, tables, and waitlists.',
}

export default function AdminPage(): JSX.Element {
  return <AdminConsole />
}
