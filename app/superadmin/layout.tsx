'use client'

import { SuperAdminLayout } from '@/components/layouts/superadmin-layout'
import { usePathname } from 'next/navigation'

export default function SuperAdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  const pathname = usePathname()

  // Don't wrap signin page with SuperAdminLayout
  if (pathname === '/superadmin/signin') {
    return <>{children}</>
  }

  return <SuperAdminLayout>{children}</SuperAdminLayout>
}
