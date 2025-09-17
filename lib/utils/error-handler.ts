/**
 * Error handling utilities for graceful error management
 */

/**
 * Checks if an error is an expected authentication error that should be handled silently
 */
export function isExpectedAuthError(error: unknown): boolean {
  if (!error) return false

  // In development, be more permissive and show more errors for debugging
  if (process.env.NODE_ENV === 'development') {
    return false
  }

  // Type guard to check if error has message and code properties
  const hasMessage = (
    err: unknown
  ): err is {
    message: string
    code?: string
    status?: number
    statusCode?: number
  } => {
    return typeof err === 'object' && err !== null && 'message' in err
  }

  if (!hasMessage(error)) return false

  const errorMessage = error.message?.toLowerCase() || ''
  const errorCode = error.code || ''

  // Expected authentication errors that should be handled silently
  const expectedErrors = [
    'invalid login credentials',
    'email not confirmed',
    'user not found',
    'invalid email or password',
    'too many requests',
    'invalid_grant',
    'invalid_request',
    'unauthorized_client',
    'unsupported_grant_type',
    'invalid_scope',
    'access_denied',
    'server_error',
    'temporarily_unavailable',
  ]

  // Check for expected error messages
  if (expectedErrors.some((expected) => errorMessage.includes(expected))) {
    return true
  }

  // Check for specific HTTP status codes that are expected
  const expectedStatusCodes = [400, 401, 403, 406, 429]
  const status = error.status || error.statusCode
  if (status && expectedStatusCodes.includes(status)) {
    return true
  }

  // Check for Supabase-specific error codes
  const supabaseErrorCodes = [
    'invalid_credentials',
    'email_not_confirmed',
    'user_not_found',
    'too_many_requests',
  ]

  if (supabaseErrorCodes.includes(errorCode)) {
    return true
  }

  return false
}

/**
 * Safely handles errors, only logging unexpected ones
 */
export function handleError(error: unknown, context?: string): void {
  if (isExpectedAuthError(error)) {
    // In development, still log expected errors for debugging
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(
        `Expected auth error${context ? ` in ${context}` : ''}:`,
        error
      )
    }
    return
  }

  // Log unexpected errors for debugging
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(`Unexpected error${context ? ` in ${context}` : ''}:`, error)
  }
}

/**
 * Wraps async functions to handle errors gracefully
 */
export function withErrorHandling<
  T extends (...args: unknown[]) => Promise<unknown>,
>(fn: T, context?: string): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      handleError(error, context)
      throw error // Re-throw to allow calling code to handle if needed
    }
  }) as T
}
