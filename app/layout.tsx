import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { UserProvider } from '@/lib/auth/user-context'
import { ThemeProvider } from '@/components/theme-provider'
import { UserThemeProvider } from '@/components/user-theme-provider'
import { Toaster } from 'sonner'
import { getServerUser } from '@/lib/auth/server-auth'
import { Suspense } from 'react'
import { Loading } from '@/components/ui/loading'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevents FOUT
  preload: true, // Preloads the font
  fallback: ['system-ui', 'arial'], // Fallback fonts
  variable: '--font-inter', // CSS variable for consistent font loading
})

export const metadata: Metadata = {
  title: 'DeepStack',
  description:
    'Find poker games, join waitlists, and connect with friends across multiple poker rooms.',
  keywords: ['poker', 'poker room', 'waitlist', 'tournaments', 'games'],
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}): Promise<JSX.Element> {
  const initialUser = await getServerUser()

  return (
    <html
      lang='en'
      className={inter.variable}
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

                  // Apply neutral color theme immediately to prevent flash
                  const isDark = document.documentElement.classList.contains('dark');
                  const neutralTheme = {
                    light: {
                      '--background': '0 0% 100%',
                      '--foreground': '0 0% 3.9%',
                      '--card': '0 0% 100%',
                      '--card-foreground': '0 0% 3.9%',
                      '--popover': '0 0% 100%',
                      '--popover-foreground': '0 0% 3.9%',
                      '--primary': '0 0% 9%',
                      '--primary-foreground': '0 0% 98%',
                      '--secondary': '0 0% 96.1%',
                      '--secondary-foreground': '0 0% 9%',
                      '--muted': '0 0% 96.1%',
                      '--muted-foreground': '0 0% 45.1%',
                      '--accent': '0 0% 96.1%',
                      '--accent-foreground': '0 0% 9%',
                      '--destructive': '0 84.2% 60.2%',
                      '--destructive-foreground': '0 0% 98%',
                      '--border': '0 0% 89.8%',
                      '--input': '0 0% 89.8%',
                      '--ring': '0 0% 3.9%'
                    },
                    dark: {
                      '--background': '0 0% 3.9%',
                      '--foreground': '0 0% 98%',
                      '--card': '0 0% 3.9%',
                      '--card-foreground': '0 0% 98%',
                      '--popover': '0 0% 3.9%',
                      '--popover-foreground': '0 0% 98%',
                      '--primary': '0 0% 98%',
                      '--primary-foreground': '0 0% 9%',
                      '--secondary': '0 0% 14.9%',
                      '--secondary-foreground': '0 0% 98%',
                      '--muted': '0 0% 14.9%',
                      '--muted-foreground': '0 0% 63.9%',
                      '--accent': '0 0% 14.9%',
                      '--accent-foreground': '0 0% 98%',
                      '--destructive': '0 62.8% 30.6%',
                      '--destructive-foreground': '0 0% 98%',
                      '--border': '0 0% 14.9%',
                      '--input': '0 0% 14.9%',
                      '--ring': '0 0% 83.1%'
                    }
                  };
                  
                  const colors = isDark ? neutralTheme.dark : neutralTheme.light;
                  Object.entries(colors).forEach(([property, value]) => {
                    document.documentElement.style.setProperty(property, value);
                  });

                  // Apply font immediately to prevent FOUT
                  document.documentElement.style.setProperty('--font-inter', 'Inter, system-ui, -apple-system, sans-serif');
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
      <body>
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
