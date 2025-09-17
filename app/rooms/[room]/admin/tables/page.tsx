import { AdminTablesPage } from '@/components/admin/admin-tables-page'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tables Management | DeepStack',
  description: 'Manage poker tables, seating, and table assignments.',
}

export default function TablesPage(): JSX.Element {
  return <AdminTablesPage />
}
