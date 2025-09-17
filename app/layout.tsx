import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { UserProvider } from '@/lib/auth/user-context'
import { ThemeProvider } from '@/components/theme-provider'
import { UserThemeProvider } from '@/components/user-theme-provider'
import { Toaster } from 'sonner'
// import { getServerUser } from '@/lib/auth/server-auth' // Disabled to prevent SSR/client mismatch
import { Suspense } from 'react'
import { Loading } from '@/components/ui/loading'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevents FOUT
  preload: true, // Preloads the font
  fallback: ['system-ui', 'arial'], // Fallback fonts
})

export const metadata: Metadata = {
  title: 'Home | DeepStack',
  description:
    'Find poker games, join waitlists, and connect with friends across multiple poker rooms.',
  keywords: ['poker', 'poker room', 'waitlist', 'tournaments', 'games'],
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}): Promise<JSX.Element> {
  // Disable server-side auth to prevent SSR/client mismatch
  const initialUser = null

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
        <link
          rel='manifest'
          href='/api/manifest'
        />
        <link
          rel='preconnect'
          href='https://fonts.googleapis.com'
        />
        <link
          rel='preconnect'
          href='https://fonts.gstatic.com'
          crossOrigin=''
        />
        <meta
          name='apple-mobile-web-app-capable'
          content='yes'
        />
        <meta
          name='apple-mobile-web-app-status-bar-style'
          content='default'
        />
        <meta
          name='apple-mobile-web-app-title'
          content='DeepStack'
        />
        <meta
          name='application-name'
          content='DeepStack'
        />
        <meta
          name='mobile-web-app-capable'
          content='yes'
        />
        <meta
          name='theme-color'
          content='#000000'
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else if (theme === 'light') {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                  } else {
                    // Default to system preference (no theme saved or theme is 'system')
                    if (systemPrefersDark) {
                      document.documentElement.classList.add('dark');
                      document.documentElement.classList.remove('light');
                    } else {
                      document.documentElement.classList.add('light');
                      document.documentElement.classList.remove('dark');
                    }
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
        <UserProvider initialUser={initialUser}>
          <ThemeProvider>
            <UserThemeProvider>
              <Suspense
                fallback={
                  <Loading
                    fullScreen
                    size='lg'
                    text='Loading...'
                  />
                }
              >
                <div className='min-h-screen bg-background flex flex-col'>
                  <Navigation />
                  <main className='flex-1 w-full max-w-7xl mx-auto px-4 py-6 pt-24'>
                    {children}
                  </main>
                  <Footer />
                </div>
              </Suspense>
              <Toaster />
            </UserThemeProvider>
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  )
}
