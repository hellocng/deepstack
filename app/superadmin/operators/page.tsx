import { SuperAdminOperatorsPage } from '@/components/superadmin/superadmin-operators-page'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Operators Management | DeepStack',
  description: 'Manage poker room operators and their permissions.',
}

export default function OperatorsPage(): JSX.Element {
  return <SuperAdminOperatorsPage />
}
