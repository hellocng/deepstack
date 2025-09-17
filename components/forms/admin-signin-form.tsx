'use client'

import { useState } from 'react'
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
import { createClient } from '@/lib/supabase/client'
import { handleError, isExpectedAuthError } from '@/lib/utils/error-handler'
import { useUser } from '@/lib/auth/user-context'

const adminSignInSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
})

type AdminSignInFormData = z.infer<typeof adminSignInSchema>

export function AdminSignInForm(): JSX.Element {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<{ room?: string }>()
  const { refreshUser } = useUser()
  const roomSlug = params?.room ?? ''
  const redirectParam = searchParams.get('redirect')
  const redirectTo =
    redirectParam && redirectParam.startsWith('/')
      ? redirectParam
      : roomSlug
        ? `/${roomSlug}/admin`
        : '/rooms'

  const form = useForm<AdminSignInFormData>({
    resolver: zodResolver(adminSignInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: AdminSignInFormData): Promise<void> => {
    setLoading(true)
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
        const { data: operator, error: operatorError } = await supabase
          .from('operators')
          .select('id, role, room_id')
          .eq('auth_id', authData.user.id)
          .single()

        if (operatorError || !operator) {
          await supabase.auth.signOut()
          setError(
            'Access denied. This account is not authorized for admin access.'
          )
          setLoading(false)
          return
        }

        await refreshUser()
        router.replace(redirectTo)
        return
      }

      setLoading(false)
    } catch (err) {
      if (isExpectedAuthError(err)) {
        setError('Invalid email or password. Please try again.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to sign in')
      }
      handleError(err, 'Admin signin')
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center px-4 -mt-24'>
      <Card className='w-full max-w-md hover:shadow-none hover:cursor-default'>
        <CardHeader className='text-center pb-6'>
          <CardTitle className='text-2xl font-bold select-none cursor-default'>
            Admin Sign In
          </CardTitle>
          <CardDescription className='mt-2 select-none cursor-default'>
            Sign in to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className='px-6 pb-6'>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-6'
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
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
