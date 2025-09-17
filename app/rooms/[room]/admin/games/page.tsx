import { AdminGamesPage } from '@/components/admin/admin-games-page'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Games Management | DeepStack',
  description: 'Create, edit, and manage poker games in your room.',
}

export default function GamesPage(): JSX.Element {
  return <AdminGamesPage />
}
