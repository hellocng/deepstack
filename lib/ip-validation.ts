import { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types'

export interface IPValidationResult {
  isAllowed: boolean
  clientIP: string
  reason?: string
}

/**
 * Get the real client IP address from request headers
 * Handles various proxy configurations and CDN setups
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  const xClientIP = request.headers.get('x-client-ip')

  // Cloudflare connecting IP (most reliable for CF setups)
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  // Real IP header (common with nginx)
  if (realIP) {
    return realIP
  }

  // X-Client-IP header
  if (xClientIP) {
    return xClientIP
  }

  // X-Forwarded-For header (can contain multiple IPs)
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one (original client)
    return forwarded.split(',')[0].trim()
  }

  // Fallback - no IP found
  return 'unknown'
}

/**
 * Check if an IP address matches any of the allowed IP patterns
 * Supports exact IPs, CIDR ranges, and wildcard patterns
 */
export function isIPAllowed(clientIP: string, allowedIPs: string[]): boolean {
  if (!allowedIPs || allowedIPs.length === 0) {
    return true // No restrictions
  }

  // Handle unknown IPs
  if (clientIP === 'unknown') {
    return false
  }

  return allowedIPs.some((allowedIP) => {
    const trimmedIP = allowedIP.trim()

    // Handle CIDR notation (e.g., 192.168.1.0/24)
    if (trimmedIP.includes('/')) {
      return isIPInCIDR(clientIP, trimmedIP)
    }

    // Handle exact IP match
    if (trimmedIP === clientIP) {
      return true
    }

    // Handle wildcard patterns (e.g., 192.168.1.*)
    if (trimmedIP.includes('*')) {
      const pattern = trimmedIP.replace(/\*/g, '\\d+')
      const regex = new RegExp(`^${pattern}$`)
      return regex.test(clientIP)
    }

    return false
  })
}

/**
 * Check if an IP is within a CIDR range
 * Supports IPv4 CIDR notation
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    const [network, prefixLength] = cidr.split('/')
    const mask = parseInt(prefixLength, 10)

    // Validate prefix length
    if (mask < 0 || mask > 32) {
      return false
    }

    const ipNum = ipToNumber(ip)
    const networkNum = ipToNumber(network)

    // Handle edge cases
    if (mask === 0) {
      return true // /0 matches all IPs
    }

    if (mask === 32) {
      return ipNum === networkNum // /32 is exact match
    }

    const maskNum = (0xffffffff << (32 - mask)) >>> 0

    return (ipNum & maskNum) === (networkNum & maskNum)
  } catch {
    return false
  }
}

/**
 * Convert IP address to number for CIDR calculations
 * Assumes valid IPv4 address
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.')
  if (parts.length !== 4) {
    throw new Error('Invalid IP address format')
  }

  return (
    parts.reduce((acc, octet) => {
      const num = parseInt(octet, 10)
      if (num < 0 || num > 255) {
        throw new Error('Invalid IP octet')
      }
      return (acc << 8) + num
    }, 0) >>> 0
  )
}

/**
 * Validate IP address format
 * Basic IPv4 validation
 */
export function isValidIP(ip: string): boolean {
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipRegex.test(ip)
}

/**
 * Validate CIDR notation
 * Format: IP/prefix_length (e.g., 192.168.1.0/24)
 */
export function isValidCIDR(cidr: string): boolean {
  const cidrRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[1-2][0-9]|3[0-2])$/
  return cidrRegex.test(cidr)
}

/**
 * Validate wildcard IP pattern
 * Format: IP with * wildcards (e.g., 192.168.1.*)
 */
export function isValidWildcard(ip: string): boolean {
  const wildcardRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|\*)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|\*)$/
  return wildcardRegex.test(ip)
}

/**
 * Validate IP restrictions for a room
 * Checks if the client IP is allowed to access admin routes for the room
 */
export async function validateIPAccess(
  request: NextRequest,
  roomCode: string,
  supabase: SupabaseClient<Database>
): Promise<IPValidationResult> {
  const clientIP = getClientIP(request)

  try {
    // First, verify the room exists
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('code', roomCode)
      .eq('is_active', true)
      .single()

    if (roomError || !room) {
      return {
        isAllowed: false,
        clientIP,
        reason: 'Room not found',
      }
    }

    // Get room IP restrictions using the secure function
    const { data: restrictions, error } = await supabase.rpc(
      'get_room_ip_restrictions',
      { room_code_param: roomCode }
    )

    if (error) {
      // Log error for debugging
      console.error('Error fetching IP restrictions:', error)
      return {
        isAllowed: false,
        clientIP,
        reason: 'Error validating IP access',
      }
    }

    // If no restrictions found, allow access (IP restrictions not configured)
    if (!restrictions || restrictions.length === 0) {
      return {
        isAllowed: true,
        clientIP,
      }
    }

    const restriction = restrictions[0]

    // If IP restriction is not enabled, allow access
    if (!restriction.ip_restriction_enabled) {
      return {
        isAllowed: true,
        clientIP,
      }
    }

    // Check if IP is allowed
    const allowed = isIPAllowed(clientIP, restriction.allowed_ips || [])

    return {
      isAllowed: allowed,
      clientIP,
      reason: allowed ? undefined : 'IP address not in allowed list',
    }
  } catch (error) {
    // Log error for debugging
    console.error('Error validating IP access:', error)
    return {
      isAllowed: false,
      clientIP,
      reason: 'Error validating IP access',
    }
  }
}

/**
 * Parse and validate IP restriction input
 * Converts newline-separated string to array of valid IP patterns
 */
export function parseIPRestrictions(input: string): {
  validIPs: string[]
  errors: string[]
} {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  const validIPs: string[] = []
  const errors: string[] = []

  lines.forEach((line, index) => {
    const lineNumber = index + 1

    if (line.includes('/')) {
      // CIDR notation
      if (!isValidCIDR(line)) {
        errors.push(`Line ${lineNumber}: Invalid CIDR format "${line}"`)
      } else {
        validIPs.push(line)
      }
    } else if (line.includes('*')) {
      // Wildcard pattern
      if (!isValidWildcard(line)) {
        errors.push(`Line ${lineNumber}: Invalid wildcard pattern "${line}"`)
      } else {
        validIPs.push(line)
      }
    } else {
      // Exact IP
      if (!isValidIP(line)) {
        errors.push(`Line ${lineNumber}: Invalid IP address "${line}"`)
      } else {
        validIPs.push(line)
      }
    }
  })

  return { validIPs, errors }
}

/**
 * Format IP restrictions for display
 * Converts array to newline-separated string
 */
export function formatIPRestrictions(ips: string[] | null): string {
  if (!ips || ips.length === 0) {
    return ''
  }
  return ips.join('\n')
}
