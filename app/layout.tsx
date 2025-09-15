import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { PlayerAuthProvider } from '@/lib/auth/player-auth-context'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Home | DeepStack',
  description:
    'Find poker games, join waitlists, and connect with friends across multiple poker rooms.',
  keywords: ['poker', 'poker room', 'waitlist', 'tournaments', 'games'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  return (
    <html
      lang='en'
      suppressHydrationWarning
    >
      <head>
        <link
          rel='icon'
          href='/favicon.svg'
          type='image/svg+xml'
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  
                  if (theme === 'dark' || (!theme && systemPrefersDark)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  // Fallback to light mode
                  document.documentElement.classList.add('light');
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <PlayerAuthProvider>
          <ThemeProvider>
            <div className='min-h-screen bg-background flex flex-col'>
              <Navigation />
              <main className='flex-1 container mx-auto px-4 py-6 pt-24'>
                {children}
              </main>
              <Footer />
            </div>
          </ThemeProvider>
        </PlayerAuthProvider>
      </body>
    </html>
  )
}
