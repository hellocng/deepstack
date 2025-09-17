import type { NextRequest } from 'next/server'

export interface IPViolationLog {
  timestamp: string
  clientIP: string
  roomCode: string
  userAgent: string
  path: string
  type: 'ip_restriction_violation'
  reason?: string
}

export interface SecurityEvent {
  timestamp: string
  eventType: 'ip_violation' | 'auth_failure' | 'suspicious_activity'
  clientIP: string
  userAgent: string
  path: string
  details: Record<string, unknown>
  severity: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Log IP restriction violations for security monitoring
 */
export async function logIPViolation(
  clientIP: string,
  roomCode: string,
  userAgent: string,
  path: string,
  reason?: string
): Promise<void> {
  const violation: IPViolationLog = {
    timestamp: new Date().toISOString(),
    clientIP,
    roomCode,
    userAgent,
    path,
    type: 'ip_restriction_violation',
    reason,
  }

  // Log IP restriction violation
  console.warn('IP restriction violation:', violation)

  // In production, you might want to send to external monitoring services
  if (process.env.NODE_ENV === 'production') {
    await sendToMonitoringService(violation)
  }
}

/**
 * Log general security events
 */
export async function logSecurityEvent(
  eventType: SecurityEvent['eventType'],
  clientIP: string,
  userAgent: string,
  path: string,
  details: Record<string, unknown>,
  severity: SecurityEvent['severity'] = 'medium'
): Promise<void> {
  const event: SecurityEvent = {
    timestamp: new Date().toISOString(),
    eventType,
    clientIP,
    userAgent,
    path,
    details,
    severity,
  }

  // Log security event
  console.warn('Security event:', event)

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    await sendToMonitoringService(event)
  }
}

/**
 * Send security events to external monitoring service
 * This is a placeholder - implement based on your monitoring setup
 */
async function sendToMonitoringService(
  event: IPViolationLog | SecurityEvent
): Promise<void> {
  try {
    // Example: Send to external logging service
    // await fetch(process.env.MONITORING_WEBHOOK_URL, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(event),
    // })

    // Example: Send to database
    // const supabase = await createClient()
    // await supabase.from('security_events').insert(event)

    // For now, just log to console in production
    console.warn('Security event (production):', event)
  } catch (error) {
    console.error('Failed to send security event to monitoring service:', error)
  }
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown'
}

/**
 * Check if an IP address is suspicious based on patterns
 */
export function isSuspiciousIP(ip: string): boolean {
  // Check for common suspicious patterns
  const suspiciousPatterns = [
    /^0\.0\.0\.0$/, // Invalid IP
    /^127\.0\.0\.1$/, // Localhost (might be suspicious in production)
    /^::1$/, // IPv6 localhost
    /^169\.254\./, // Link-local addresses
    /^224\./, // Multicast addresses
    /^255\./, // Broadcast addresses
  ]

  return suspiciousPatterns.some((pattern) => pattern.test(ip))
}

/**
 * Rate limiting helper for IP addresses
 * This is a simple in-memory rate limiter - in production, use Redis or similar
 */
class IPRateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number }> =
    new Map()
  private readonly maxAttempts: number
  private readonly windowMs: number

  constructor(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
    // 5 attempts per 15 minutes
    this.maxAttempts = maxAttempts
    this.windowMs = windowMs
  }

  isRateLimited(ip: string): boolean {
    const now = Date.now()
    const attempt = this.attempts.get(ip)

    if (!attempt) {
      this.attempts.set(ip, { count: 1, lastAttempt: now })
      return false
    }

    // Reset if window has passed
    if (now - attempt.lastAttempt > this.windowMs) {
      this.attempts.set(ip, { count: 1, lastAttempt: now })
      return false
    }

    // Increment count
    attempt.count++
    attempt.lastAttempt = now

    return attempt.count > this.maxAttempts
  }

  reset(ip: string): void {
    this.attempts.delete(ip)
  }

  getAttempts(ip: string): number {
    const attempt = this.attempts.get(ip)
    return attempt ? attempt.count : 0
  }
}

// Global rate limiter instance
export const ipRateLimiter = new IPRateLimiter()

/**
 * Check if an IP should be rate limited
 */
export function shouldRateLimitIP(ip: string): boolean {
  return ipRateLimiter.isRateLimited(ip)
}

/**
 * Reset rate limit for an IP (useful after successful authentication)
 */
export function resetIPRateLimit(ip: string): void {
  ipRateLimiter.reset(ip)
}

/**
 * Get current attempt count for an IP
 */
export function getIPAttemptCount(ip: string): number {
  return ipRateLimiter.getAttempts(ip)
}

/**
 * Comprehensive security check for requests
 */
export async function performSecurityCheck(
  request: NextRequest,
  roomCode: string
): Promise<{
  isAllowed: boolean
  reason?: string
  shouldLog: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
}> {
  const clientIP =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const userAgent = getUserAgent(request)
  const path = request.nextUrl.pathname

  // Check for suspicious IP patterns
  if (isSuspiciousIP(clientIP)) {
    await logSecurityEvent(
      'suspicious_activity',
      clientIP,
      userAgent,
      path,
      { reason: 'suspicious_ip_pattern', roomCode },
      'high'
    )

    return {
      isAllowed: false,
      reason: 'Suspicious IP address detected',
      shouldLog: true,
      severity: 'high',
    }
  }

  // Check rate limiting
  if (shouldRateLimitIP(clientIP)) {
    await logSecurityEvent(
      'suspicious_activity',
      clientIP,
      userAgent,
      path,
      {
        reason: 'rate_limited',
        roomCode,
        attempts: getIPAttemptCount(clientIP),
      },
      'medium'
    )

    return {
      isAllowed: false,
      reason: 'Too many attempts from this IP address',
      shouldLog: true,
      severity: 'medium',
    }
  }

  return {
    isAllowed: true,
    shouldLog: false,
    severity: 'low',
  }
}
