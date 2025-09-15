import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
}

export function Loading({
  className,
  size = 'md',
  text = 'Loading...',
  fullScreen = false,
}: LoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-10 w-10',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-sm',
  }

  const content = (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <Loader2
        className={cn('animate-spin text-muted-foreground', sizeClasses[size])}
      />
      {text && (
        <p className={cn('text-muted-foreground', textSizeClasses[size])}>
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className='fixed inset-0 bg-background flex items-center justify-center'>
        {content}
      </div>
    )
  }

  return content
}

// Table loading component similar to 10xgaming
interface TableLoadingProps {
  className?: string
  columns?: number
}

export function TableLoading({ className, columns = 5 }: TableLoadingProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Table outline with spinner */}
      <div className='border rounded-md overflow-hidden'>
        <div className='relative'>
          {/* Table header */}
          <div className='bg-muted/50 border-b'>
            <div className='flex'>
              {Array.from({ length: columns }).map((_, i) => (
                <div
                  key={i}
                  className='flex-1 px-4 py-3 text-sm font-medium text-muted-foreground'
                />
              ))}
            </div>
          </div>

          {/* Table body with spinner */}
          <div className='relative min-h-[200px]'>
            {/* Spinner overlay */}
            <div className='absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm'>
              <Loading
                size='md'
                text='Loading...'
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
