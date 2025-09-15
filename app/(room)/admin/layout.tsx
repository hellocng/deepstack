import { AdminLayout } from '@/components/layouts/admin-layout'

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  return <AdminLayout>{children}</AdminLayout>
}
