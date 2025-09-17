import { SuperAdminDashboard } from '@/components/superadmin/superadmin-dashboard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Super Admin Dashboard | DeepStack',
  description: 'Manage all poker rooms, operators, and system settings.',
}

export default function SuperAdminPage(): JSX.Element {
  return <SuperAdminDashboard />
}
