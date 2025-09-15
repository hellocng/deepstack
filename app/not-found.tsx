import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound(): JSX.Element {
  return (
    <div className='min-h-screen flex items-center justify-center bg-background'>
      <div className='text-center space-y-6 max-w-md px-4'>
        <div className='flex flex-col items-center space-y-4'>
          <div className='text-6xl'>🔍</div>
          <h1 className='text-3xl font-bold'>Page Not Found</h1>
          <p className='text-muted-foreground'>
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>

        <div className='flex flex-col gap-3'>
          <Button asChild>
            <Link href='/'>Go Home</Link>
          </Button>
          <Button
            variant='outline'
            asChild
          >
            <Link href='/rooms'>Browse Rooms</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
