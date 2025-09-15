'use client'

import {
  Download,
  SquareArrowOutUpRight,
  Share2,
  Smartphone,
  Zap,
  Shield,
  Globe,
} from 'lucide-react'
import { useState, useEffect } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import { usePWA } from '@/hooks/use-pwa'

const BENEFITS = [
  {
    icon: Smartphone,
    title: 'App-like Experience',
    description: 'Full-screen with native feel',
  },
  {
    icon: Zap,
    title: 'Faster Loading',
    description: 'Caches assets for quick startup',
  },
  {
    icon: Shield,
    title: 'Secure',
    description: 'HTTPS-only features and updates',
  },
  {
    icon: Globe,
    title: 'Cross-Platform',
    description: 'Works on phones, tablets, desktops',
  },
] as const

const MOBILE_INSTRUCTIONS = {
  icon: Share2,
  title: 'Install App',
  steps: [
    'Open your browser menu',
    'Select "Add to Home Screen"',
    'Confirm to install',
  ],
} as const

const OPEN_APP_INSTRUCTIONS = [
  {
    title: 'Browser PWA icon',
    description:
      'Click the DeepStack icon next to the address bar in your browser',
  },
  {
    title: 'Browser menu',
    description:
      'Look for "Open DeepStack" or "Launch app" in your browser menu',
  },
  {
    title: 'System app icon',
    description: 'Use the DeepStack icon in your taskbar, dock, or Start Menu',
  },
] as const

function BenefitsGrid(): JSX.Element {
  return (
    <div className='grid grid-cols-2 gap-4'>
      {BENEFITS.map((benefit, index) => (
        <div
          key={index}
          className='flex items-start gap-3'
        >
          <benefit.icon className='h-5 w-5 text-primary mt-0.5 flex-shrink-0' />
          <div>
            <h4 className='text-sm font-medium text-foreground'>
              {benefit.title}
            </h4>
            <p className='text-sm text-muted-foreground'>
              {benefit.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function InstallInstructions(): JSX.Element {
  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <MOBILE_INSTRUCTIONS.icon className='h-5 w-5 text-primary' />
        <h4 className='text-base font-medium text-foreground'>
          {MOBILE_INSTRUCTIONS.title}
        </h4>
      </div>
      <ol className='text-base text-muted-foreground space-y-3'>
        {MOBILE_INSTRUCTIONS.steps.map((step, index) => (
          <li
            key={index}
            className='flex items-start gap-3'
          >
            <span className='flex-shrink-0 w-6 h-6 rounded-full border-2 border-primary text-primary text-sm flex items-center justify-center font-medium'>
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function OpenAppInstructions(): JSX.Element {
  return (
    <div className='space-y-4'>
      {OPEN_APP_INSTRUCTIONS.map((instruction, index) => (
        <div
          key={index}
          className='space-y-2'
        >
          <h4 className='text-base font-medium text-foreground'>
            {instruction.title}
          </h4>
          <p className='text-base text-muted-foreground'>
            {instruction.description}
          </p>
        </div>
      ))}
    </div>
  )
}

// Simple media query hook for mobile detection
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia(query)
    setMatches(media.matches)

    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}

export function PWAInstall(): JSX.Element | null {
  const { isInstalled, isInAppMode, isInstallable, installApp, isLoading } =
    usePWA()
  const isMobile = !useMediaQuery('(min-width: 768px)')
  const [installDialogOpen, setInstallDialogOpen] = useState(false)
  const [openAppDialogOpen, setOpenAppDialogOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render anything during SSR to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  // Don't show if already in PWA mode
  if (isInAppMode) {
    return null
  }

  // Mobile: Show only instructions and benefits (no install button)
  if (isMobile) {
    return (
      <div className='pwa-install-component'>
        <Drawer
          open={installDialogOpen}
          onOpenChange={setInstallDialogOpen}
        >
          <DrawerTrigger asChild>
            <Button
              size='icon'
              variant='ghost'
              className='h-8 w-8'
              aria-label='View app benefits'
            >
              <Smartphone className='h-4 w-4' />
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <div className='p-6 space-y-6'>
              <div className='text-center'>
                <h3 className='text-xl font-semibold'>DeepStack App</h3>
                <p className='text-base text-muted-foreground'>
                  Get the best experience with PWA
                </p>
              </div>
              <InstallInstructions />
              <div className='h-px w-full bg-border' />
              <BenefitsGrid />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    )
  }

  // Desktop: Show "Open in App" button if already installed
  if (isInstalled) {
    return (
      <div className='pwa-install-component'>
        <Dialog
          open={openAppDialogOpen}
          onOpenChange={setOpenAppDialogOpen}
        >
          <DialogTrigger asChild>
            <Button
              size='icon'
              variant='ghost'
              className='h-8 w-8'
              aria-label='Open app'
            >
              <SquareArrowOutUpRight className='h-4 w-4' />
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='text-lg'>Open in App</DialogTitle>
              <DialogDescription className='text-base'>
                Your app is already installed. Here are ways to open it:
              </DialogDescription>
            </DialogHeader>
            <div className='pt-4'>
              <OpenAppInstructions />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Desktop: Show install button if installable
  if (isInstallable) {
    return (
      <div className='pwa-install-component'>
        <Dialog
          open={installDialogOpen}
          onOpenChange={setInstallDialogOpen}
        >
          <DialogTrigger asChild>
            <Button
              size='icon'
              variant='ghost'
              className='h-8 w-8'
              aria-label='Install app'
            >
              <Download className='h-4 w-4' />
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='text-lg'>
                Install DeepStack App
              </DialogTitle>
              <DialogDescription className='text-base'>
                Install the app for a better experience
              </DialogDescription>
            </DialogHeader>
            <div className='flex flex-col gap-6'>
              <div className='pt-4'>
                <BenefitsGrid />
              </div>
              <Button
                onClick={installApp}
                disabled={isLoading}
                className='w-full'
              >
                {isLoading ? 'Installing...' : 'Install App'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Don't show anything if not installable and not installed
  return null
}
