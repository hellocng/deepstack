'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, ArrowLeft, Users } from 'lucide-react'

export default function NotFound(): JSX.Element {
  return (
    <div className='min-h-screen flex items-center justify-center bg-background px-4 -mt-20'>
      <div className='w-full max-w-md'>
        <Card className='border-0 shadow-none'>
          <CardHeader className='text-center pb-4'>
            <CardTitle className='text-2xl font-bold tracking-tight'>
              Room Not Found
            </CardTitle>
          </CardHeader>

          <CardContent className='space-y-4'>
            <div className='grid gap-2 sm:grid-cols-2'>
              <Button
                asChild
                size='default'
                className='h-10'
              >
                <Link
                  href='/'
                  className='flex items-center gap-2'
                >
                  <Home className='w-4 h-4' />
                  Go Home
                </Link>
              </Button>

              <Button
                variant='outline'
                size='default'
                asChild
                className='h-10'
              >
                <Link
                  href='/rooms'
                  className='flex items-center gap-2'
                >
                  <Users className='w-4 h-4' />
                  Browse Rooms
                </Link>
              </Button>
            </div>

            <div className='pt-2 border-t'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => window.history.back()}
                className='w-full flex items-center gap-2 h-8'
              >
                <ArrowLeft className='w-3 h-3' />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
