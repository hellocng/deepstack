import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DeepStack - Poker Room Management',
  description: 'Find poker games, join waitlists, and connect with friends across multiple poker rooms.',
  keywords: ['poker', 'poker room', 'waitlist', 'tournaments', 'games'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
