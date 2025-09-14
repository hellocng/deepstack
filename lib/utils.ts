import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Formats a phone number consistently across the application
 * @param phoneNumber - Raw phone number (digits only or with formatting)
 * @returns Formatted phone number as +1 (xxx) xxx-xxxx or (xxx) xxx-xxxx
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digits
  const digits = phoneNumber.replace(/\D/g, '')

  // Handle US/Canada numbers with country code (11 digits starting with 1)
  if (digits.length === 11 && digits.startsWith('1')) {
    const areaCode = digits.slice(1, 4)
    const exchange = digits.slice(4, 7)
    const number = digits.slice(7, 11)
    return `+1 (${areaCode}) ${exchange}-${number}`
  }

  // Handle 10-digit US/Canada numbers (no country code)
  if (digits.length === 10) {
    const areaCode = digits.slice(0, 3)
    const exchange = digits.slice(3, 6)
    const number = digits.slice(6, 10)
    return `(${areaCode}) ${exchange}-${number}`
  }

  // Handle partial numbers during input
  if (digits.length <= 3) {
    return digits
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  } else if (digits.length <= 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  // Fallback for other cases
  return phoneNumber
}
