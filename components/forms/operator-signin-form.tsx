'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { handleError, isExpectedAuthError } from '@/lib/utils/error-handler'
import { useUser } from '@/lib/auth/user-context'
import { validateIPAccess } from '@/lib/ip-validation'

const operatorSignInSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
})

type OperatorSignInFormData = z.infer<typeof operatorSignInSchema>

interface OperatorSignInFormProps {
  title: string
  description: string
  role: 'admin' | 'superadmin'
  redirectPath?: string
  showIpRestriction?: boolean
}

export function OperatorSignInForm({
  title,
  description,
  role,
  redirectPath,
  showIpRestriction = false,
}: OperatorSignInFormProps): JSX.Element {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ipRestricted, setIpRestricted] = useState(false)
  const [clientIP, setClientIP] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<{ room?: string }>()
  const { refreshUser: _refreshUser } = useUser()
  const roomSlug = params?.room ?? ''
  const redirectParam = searchParams.get('redirect')
  const ipError = searchParams.get('error')
  const clientIPFromParams = searchParams.get('ip')

  // Use ref to prevent multiple submissions
  const isSubmittingRef = useRef(false)

  // Check IP restrictions on component mount - with caching to prevent multiple requests
  const checkIPRestrictions = useCallback(async (): Promise<void> => {
    if (!showIpRestriction || role !== 'admin' || !roomSlug) return

    // Check if we already have the result cached
    const cacheKey = `ip-check-${roomSlug}`
    const cachedResult = sessionStorage.getItem(cacheKey)

    if (cachedResult) {
      try {
        const { isRestricted, clientIP: cachedIP } = JSON.parse(cachedResult)
        if (isRestricted) {
          setIpRestricted(true)
          setClientIP(cachedIP)
        }
        return
      } catch {
        // If cache is corrupted, continue with fresh check
      }
    }

    try {
      const supabase = createClient()

      // Create a mock NextRequest for client-side IP validation
      const mockRequest = {
        headers: new Headers({
          'x-forwarded-for': '',
          'x-real-ip': '',
          'cf-connecting-ip': '',
          'x-client-ip': '',
        }),
        nextUrl: new URL(window.location.href),
        cookies: new Map(),
        page: undefined,
        ua: undefined,
      } as unknown as Parameters<typeof validateIPAccess>[0]

      const ipValidation = await validateIPAccess(
        mockRequest,
        roomSlug,
        supabase
      )

      // Cache the result for 5 minutes
      const result = {
        isRestricted: !ipValidation.isAllowed,
        clientIP: ipValidation.clientIP,
        timestamp: Date.now(),
      }
      sessionStorage.setItem(cacheKey, JSON.stringify(result))

      if (!ipValidation.isAllowed) {
        setIpRestricted(true)
        setClientIP(ipValidation.clientIP)
      }
    } catch (_error) {
      // Handle error silently to prevent double requests
      // IP validation errors are not critical for sign-in functionality
    }
  }, [showIpRestriction, role, roomSlug])

  // Only run IP check once on mount
  useEffect(() => {
    let isMounted = true

    const runCheck = async (): Promise<void> => {
      if (isMounted) {
        await checkIPRestrictions()
      }
    }

    runCheck()

    return (): void => {
      isMounted = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- Empty dependency array to run only once

  // Determine redirect path based on role and props
  const _getRedirectPath = async (): Promise<string> => {
    if (redirectPath) {
      return redirectPath
    }

    if (role === 'superadmin') {
      return '/superadmin'
    }

    // For admin role, use redirect param or room-specific admin path
    if (redirectParam && redirectParam.startsWith('/')) {
      return redirectParam
    }

    if (roomSlug) {
      return `/admin`
    }

    // For root admin sign-in, we'll redirect to the operator's room admin page
    // This will be handled in the onSubmit function after we get the operator data
    return '/admin/signin'
  }

  // We'll get the redirect path when we need it in the onSubmit function

  const form = useForm<OperatorSignInFormData>({
    resolver: zodResolver(operatorSignInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onChange', // Enable real-time validation
  })

  const onSubmit = async (data: OperatorSignInFormData): Promise<void> => {
    // Prevent multiple submissions
    if (isSubmittingRef.current || loading) {
      return
    }

    isSubmittingRef.current = true
    setLoading(true)
    setIsSubmitting(true)
    setError('')

    try {
      const supabase = createClient()

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })

      if (authError) {
        throw authError
      }

      if (authData.user) {
        // Build the query based on role
        let query = supabase
          .from('operators')
          .select('id, role, room_id, room:rooms(code)')
          .eq('auth_id', authData.user.id)
          .eq('is_active', true)

        // For superadmin, check specifically for superadmin role
        if (role === 'superadmin') {
          query = query.eq('role', 'superadmin')
        }

        const { data: operator, error: operatorError } = await query.single()

        if (operatorError || !operator) {
          await supabase.auth.signOut()
          const errorMessage =
            role === 'superadmin'
              ? 'Access denied. This account is not authorized for Super Admin access.'
              : 'Access denied. This account is not authorized for admin access.'
          setError(errorMessage)
          setLoading(false)
          setIsSubmitting(false)
          isSubmittingRef.current = false
          return
        }

        // Determine redirect path based on role and operator data
        let finalRedirectPath: string

        if (role === 'superadmin') {
          finalRedirectPath = '/superadmin'
        } else if (redirectPath) {
          finalRedirectPath = redirectPath
        } else if (redirectParam && redirectParam.startsWith('/')) {
          finalRedirectPath = redirectParam
        } else if (roomSlug) {
          finalRedirectPath = `/admin`
        } else if (operator.room && operator.room.code) {
          // For root admin sign-in, redirect to flat admin
          finalRedirectPath = `/admin`
        } else {
          // Fallback if no room is found
          setError('No room assigned to this operator account.')
          setLoading(false)
          setIsSubmitting(false)
          isSubmittingRef.current = false
          return
        }

        // Redirect immediately - the auth state change listener will handle user context update
        // This prevents the loading state from interfering with the redirect
        if (role === 'superadmin') {
          router.push(finalRedirectPath)
        } else {
          router.replace(finalRedirectPath)
        }
        return
      }

      setLoading(false)
      setIsSubmitting(false)
      isSubmittingRef.current = false
    } catch (err) {
      if (isExpectedAuthError(err)) {
        setError('Invalid email or password. Please try again.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to sign in')
      }
      handleError(
        err,
        `${role === 'superadmin' ? 'Super Admin' : 'Admin'} signin`
      )
      setLoading(false)
      setIsSubmitting(false)
      isSubmittingRef.current = false
    }
  }

  // Handle password manager autofill
  useEffect(() => {
    const handleAutofill = (): void => {
      // Check if password field has been autofilled
      const passwordInput = document.getElementById(
        'password'
      ) as HTMLInputElement
      if (passwordInput && passwordInput.value && !form.getValues('password')) {
        form.setValue('password', passwordInput.value, { shouldValidate: true })
      }
    }

    // Check for autofill after a short delay
    const timeoutId = setTimeout(handleAutofill, 100)

    // Also listen for input events to catch autofill
    const passwordInput = document.getElementById('password')
    if (passwordInput) {
      passwordInput.addEventListener('input', handleAutofill)
    }

    return (): void => {
      clearTimeout(timeoutId)
      if (passwordInput) {
        passwordInput.removeEventListener('input', handleAutofill)
      }
    }
  }, [form])

  return (
    <div className='min-h-screen flex items-center justify-center px-4 -mt-24'>
      <Card className='w-full max-w-md hover:shadow-none hover:cursor-default'>
        <CardHeader className='text-center pb-6'>
          <CardTitle className='text-2xl font-bold select-none cursor-default'>
            {title}
          </CardTitle>
          <CardDescription className='mt-2 select-none cursor-default'>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className='px-6 pb-6'>
          {showIpRestriction &&
            (ipError === 'ip_restricted' || ipRestricted) && (
              <Alert
                variant='destructive'
                className='mb-6'
              >
                <AlertTriangle className='h-4 w-4' />
                <AlertDescription>
                  <div className='space-y-2'>
                    <p className='font-medium'>
                      Access denied from your IP address
                    </p>
                    <p className='text-sm'>
                      Your IP address ({clientIP || clientIPFromParams}) is not
                      authorized to access this room&apos;s admin panel.
                    </p>
                    <p className='text-sm'>
                      Please contact your administrator to add your IP to the
                      allowed list.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-6'
            noValidate // Let browser handle validation for password managers
          >
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label
                  htmlFor='email'
                  className='text-sm font-medium'
                >
                  Email
                </Label>
                <Input
                  id='email'
                  type='email'
                  placeholder='Enter your email'
                  {...form.register('email')}
                  className='h-11'
                  autoComplete='email'
                  disabled={loading}
                />
                {form.formState.errors.email && (
                  <p className='text-sm text-destructive'>
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label
                  htmlFor='password'
                  className='text-sm font-medium'
                >
                  Password
                </Label>
                <Input
                  id='password'
                  type='password'
                  placeholder='Enter your password'
                  {...form.register('password')}
                  className='h-11'
                  autoComplete='current-password'
                  disabled={loading}
                />
                {form.formState.errors.password && (
                  <p className='text-sm text-destructive'>
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className='text-sm text-destructive text-center py-2'>
                {error}
              </div>
            )}

            <Button
              type='submit'
              className='w-full h-11'
              disabled={loading || isSubmitting}
            >
              {loading || isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
