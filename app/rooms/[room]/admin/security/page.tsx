'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Shield, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SecurityPage(): JSX.Element {
  const router = useRouter()

  return (
    <div className='space-y-6'>
      {/* Header with back button */}
      <div className='flex items-center gap-4'>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8'
          onClick={() => router.back()}
        >
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <h1 className='text-3xl font-bold tracking-tight'>Security</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Shield className='h-5 w-5' />
            IP Restrictions
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          <Alert>
            <Info className='h-4 w-4' />
            <AlertDescription>
              <div className='space-y-2'>
                <p className='font-medium'>IP Restrictions Management Moved</p>
                <p className='text-sm'>
                  IP restrictions for admin access are now managed by the Super
                  Admin. This change provides centralized control and better
                  security oversight for all room IP restrictions.
                </p>
                <p className='text-sm'>
                  If you need to modify IP restrictions for this room, please
                  contact your Super Admin or system administrator.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
