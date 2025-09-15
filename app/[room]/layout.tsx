import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TenantHeader } from '@/components/tenant-header'
import { TenantNavigation } from '@/components/tenant-navigation'

interface RoomLayoutProps {
  children: React.ReactNode
  params: Promise<{
    room: string
  }>
}

export default async function RoomLayout({
  children,
  params,
}: RoomLayoutProps): Promise<JSX.Element> {
  const supabase = await createClient()
  const resolvedParams = await params

  // Get room information
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', resolvedParams.room)
    .eq('is_active', true)
    .single()

  if (error || !room) {
    notFound()
  }

  return (
    <div className='min-h-screen bg-background'>
      <TenantHeader tenant={room} />
      <TenantNavigation tenant={room} />
      <main className='w-full max-w-7xl mx-auto px-4 py-6'>{children}</main>
    </div>
  )
}
