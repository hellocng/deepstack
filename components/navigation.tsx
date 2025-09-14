'use client'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export function Navigation() {
  return (
    <header className='container mx-auto px-4 py-6'>
      <div className='flex items-center justify-between'>
        <div></div>
        <div className='flex items-center space-x-2'>
          <ThemeToggle />
          <Button variant='outline'>Sign In</Button>
        </div>
      </div>
    </header>
  )
}
