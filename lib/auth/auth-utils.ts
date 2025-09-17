import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

/**
 * Client-side authentication utilities
 */
export class ClientAuthUtils {
  private static supabase = createClient()

  /**
   * Send OTP to phone number
   */
  static async sendOTP(phoneNumber: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOtp({
      phone: phoneNumber,
      options: {
        channel: 'sms',
      },
    })

    if (error) {
      throw new Error(`Failed to send OTP: ${error.message}`)
    }
  }

  /**
   * Verify OTP and sign in
   */
  static async verifyOTP(phoneNumber: string, token: string): Promise<User> {
    const { data, error } = await this.supabase.auth.verifyOtp({
      phone: phoneNumber,
      token,
      type: 'sms',
    })

    if (error) {
      throw new Error(`Failed to verify OTP: ${error.message}`)
    }

    if (!data.user) {
      throw new Error('No user returned from OTP verification')
    }

    return data.user
  }

  /**
   * Sign in with email and password (for operators)
   */
  static async signInWithEmail(email: string, password: string): Promise<User> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(`Failed to sign in: ${error.message}`)
    }

    if (!data.user) {
      throw new Error('No user returned from sign in')
    }

    return data.user
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut()

    if (error) {
      throw new Error(`Failed to sign out: ${error.message}`)
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<User | null> {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser()

    if (error) {
      throw new Error(`Failed to get current user: ${error.message}`)
    }

    return user
  }

  /**
   * Get current session
   */
  static async getCurrentSession(): Promise<unknown> {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.getSession()

    if (error) {
      throw new Error(`Failed to get current session: ${error.message}`)
    }

    return session
  }
}

/**
 * Additional client-side authentication utilities
 */
export class ClientAuthUtilsExtended {
  /**
   * Check if user is authenticated client-side
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const user = await ClientAuthUtils.getCurrentUser()
      return user !== null
    } catch {
      return false
    }
  }
}

/**
 * Auth error types for better error handling
 */
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'invalid_credentials',
  USER_NOT_FOUND = 'user_not_found',
  EMAIL_NOT_CONFIRMED = 'email_not_confirmed',
  TOO_MANY_REQUESTS = 'too_many_requests',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * Parse auth error and return standardized error type
 */
export function parseAuthError(error: unknown): {
  type: AuthErrorType
  message: string
  originalError: unknown
} {
  if (!error || typeof error !== 'object') {
    return {
      type: AuthErrorType.UNKNOWN_ERROR,
      message: 'An unknown error occurred',
      originalError: error,
    }
  }

  const errorObj = error as Record<string, unknown>
  const message = (errorObj.message as string) || 'An unknown error occurred'
  const code = (errorObj.code as string) || ''

  // Map common error messages to error types
  if (
    message.includes('Invalid login credentials') ||
    message.includes('invalid_grant')
  ) {
    return {
      type: AuthErrorType.INVALID_CREDENTIALS,
      message: 'Invalid email or password',
      originalError: error,
    }
  }

  if (message.includes('User not found') || code === 'user_not_found') {
    return {
      type: AuthErrorType.USER_NOT_FOUND,
      message: 'User not found',
      originalError: error,
    }
  }

  if (
    message.includes('Email not confirmed') ||
    code === 'email_not_confirmed'
  ) {
    return {
      type: AuthErrorType.EMAIL_NOT_CONFIRMED,
      message: 'Please confirm your email before signing in',
      originalError: error,
    }
  }

  if (message.includes('Too many requests') || code === 'too_many_requests') {
    return {
      type: AuthErrorType.TOO_MANY_REQUESTS,
      message: 'Too many requests. Please try again later',
      originalError: error,
    }
  }

  if (message.includes('Network') || message.includes('fetch')) {
    return {
      type: AuthErrorType.NETWORK_ERROR,
      message: 'Network error. Please check your connection',
      originalError: error,
    }
  }

  return {
    type: AuthErrorType.UNKNOWN_ERROR,
    message,
    originalError: error,
  }
}
