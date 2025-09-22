'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Timer } from 'lucide-react'

interface CountdownBadgeProps {
  targetTime: string
  onExpired?: () => void
  className?: string
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

export function CountdownBadge({
  targetTime,
  onExpired,
  className,
  variant = 'default',
}: CountdownBadgeProps): JSX.Element {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isExpired, setIsExpired] = useState<boolean>(false)

  useEffect(() => {
    const calculateTimeLeft = (): number => {
      const now = new Date().getTime()
      const target = new Date(targetTime).getTime()
      const difference = target - now

      if (difference <= 0) {
        setIsExpired(true)
        onExpired?.()
        return 0
      }

      return Math.floor(difference / 1000)
    }

    const updateTimer = (): void => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)
    }

    // Initial calculation
    updateTimer()

    // Update every second
    const interval = setInterval(updateTimer, 1000)

    return (): void => {
      clearInterval(interval)
    }
  }, [targetTime, onExpired])

  const formatTime = (seconds: number): string => {
    if (isExpired) return 'Expired'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    // Format as H:mm:ss (hours can be single digit, minutes and seconds always 2 digits)
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getVariant = ():
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline' => {
    if (isExpired) return 'destructive'
    if (timeLeft <= 300) return 'destructive' // 5 minutes or less
    if (timeLeft <= 900) return 'secondary' // 15 minutes or less
    return variant
  }

  return (
    <Badge
      variant={getVariant()}
      className={cn(
        'font-mono text-xs flex items-center gap-1',
        isExpired && 'animate-pulse',
        className
      )}
    >
      <Timer className='h-3 w-3' />
      {formatTime(timeLeft)}
    </Badge>
  )
}
