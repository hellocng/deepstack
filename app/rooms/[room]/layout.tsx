import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  const roomIdentifier = resolvedParams.room
  const identifierColumn = UUID_REGEX.test(roomIdentifier) ? 'id' : 'code'

  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq(identifierColumn, roomIdentifier)
    .eq('is_active', true)
    .single()

  if (error || !room) {
    notFound()
  }

  return (
    <div className='min-h-screen bg-background'>
      <main className='w-full max-w-7xl mx-auto px-4 py-6'>{children}</main>
    </div>
  )
}
