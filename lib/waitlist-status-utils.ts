import type { Database } from '@/types/database'

export type WaitlistStatus = Database['public']['Enums']['waitlist_status']

export interface WaitlistStatusConfig {
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  label: string
  description: string
  showCountdown: boolean
  countdownMinutes?: number
  actions: string[]
}

export const WAITLIST_STATUS_CONFIG: Record<
  WaitlistStatus,
  WaitlistStatusConfig
> = {
  waiting: {
    variant: 'secondary',
    label: 'Waiting',
    description: 'Player is checked in and waiting for a seat',
    showCountdown: false,
    actions: ['notify', 'cancel'],
  },
  calledin: {
    variant: 'secondary',
    label: 'Called In',
    description: 'Player has 90 minutes to check in',
    showCountdown: true,
    countdownMinutes: 90,
    actions: ['checkin', 'cancel'],
  },
  notified: {
    variant: 'default',
    label: 'Notified',
    description: 'Player has 5 minutes to respond',
    showCountdown: true,
    countdownMinutes: 5,
    actions: ['assign', 'recall', 'cancel'],
  },
  cancelled: {
    variant: 'secondary',
    label: 'Cancelled',
    description: 'Entry was cancelled',
    showCountdown: false,
    actions: [],
  },
  seated: {
    variant: 'outline',
    label: 'Seated',
    description: 'Player is seated at a table',
    showCountdown: false,
    actions: [],
  },
  expired: {
    variant: 'destructive',
    label: 'Expired',
    description: 'Time limit exceeded',
    showCountdown: false,
    actions: [],
  },
}

export function getStatusConfig(
  status: WaitlistStatus | null
): WaitlistStatusConfig {
  return WAITLIST_STATUS_CONFIG[status || 'calledin']
}

export function getTargetTime(
  status: WaitlistStatus,
  timestamp: string | null,
  created_at?: string | null
): string | null {
  const config = getStatusConfig(status)
  if (!config.countdownMinutes) return null

  // For 'calledin' status, use created_at timestamp for the 90-minute countdown
  // For 'notified' status, use the notified_at timestamp for the 5-minute countdown
  const baseTimestamp = status === 'calledin' ? created_at : timestamp
  if (!baseTimestamp) return null

  const baseTime = new Date(baseTimestamp)
  const targetTime = new Date(
    baseTime.getTime() + config.countdownMinutes * 60 * 1000
  )
  return targetTime.toISOString()
}

export function shouldShowInActiveList(status: WaitlistStatus | null): boolean {
  return status === 'waiting' || status === 'calledin' || status === 'notified'
}

export function shouldShowInExpiredList(
  status: WaitlistStatus | null
): boolean {
  return status === 'cancelled' || status === 'expired'
}
