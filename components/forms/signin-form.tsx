'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useUser } from '@/lib/auth/user-context'

const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .refine(
      (phone) => {
        // Remove all non-digits
        const digits = phone.replace(/\D/g, '')
        // Check if it's a valid US/Canada phone number (10 digits)
        return digits.length === 10
      },
      {
        message: 'Please enter a valid 10-digit phone number',
      }
    ),
})

const otpSchema = z.object({
  otp: z.string().length(6, 'Please enter the 6-digit code'),
})

const aliasSchema = z.object({
  alias: z
    .string()
    .min(2, 'Alias must be at least 2 characters')
    .max(20, 'Alias must be less than 20 characters'),
})

type PhoneFormData = z.infer<typeof phoneSchema>
type OTPFormData = z.infer<typeof otpSchema>
type AliasFormData = z.infer<typeof aliasSchema>

export function SignInForm(): JSX.Element {
  const [step, setStep] = useState<'phone' | 'otp' | 'alias'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { sendOTP, verifyOTP } = useUser()
  const router = useRouter()

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: '',
    },
  })

  const otpForm = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  })

  const aliasForm = useForm<AliasFormData>({
    resolver: zodResolver(aliasSchema),
    defaultValues: {
      alias: '',
    },
  })

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '')

    // Format as +1 (xxx) xxx-xxxx for US/Canada numbers
    if (digits.length === 11 && digits.startsWith('1')) {
      // Handle +1xxxxxxxxxx format
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    } else if (digits.length === 10) {
      // Handle xxxxxxxxxx format
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }

    // Fallback to original if can't format
    return phone
  }

  const onPhoneSubmit = async (data: PhoneFormData): Promise<void> => {
    setLoading(true)
    setError('')

    try {
      // Convert formatted phone to international format
      const digits = data.phone.replace(/\D/g, '')
      const internationalPhone =
        digits.length === 10 ? `+1${digits}` : `+${digits}`

      await sendOTP(internationalPhone)
      setPhoneNumber(internationalPhone)
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  const onOTPSubmit = async (data: OTPFormData): Promise<void> => {
    setLoading(true)
    setError('')

    try {
      const needsAliasSet = await verifyOTP(phoneNumber, data.otp)
      if (needsAliasSet) {
        setNeedsAlias(true)
        setStep('alias')
      } else {
        router.push('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const onAliasSubmit = async (data: AliasFormData): Promise<void> => {
    setLoading(true)
    setError('')

    try {
      // Update the player's alias in the database
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { error } = await supabase
        .from('players')
        .update({ alias: data.alias })
        .eq('phone_number', phoneNumber)

      if (error) throw error

      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set alias')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToPhone = (): void => {
    setStep('phone')
    setError('')
    otpForm.reset()
  }

  return (
    <div className='min-h-screen flex items-center justify-center px-4 -mt-24'>
      <Card className='w-full max-w-md hover:shadow-none hover:cursor-default'>
        <CardHeader className='text-center pb-6'>
          <CardTitle className='text-2xl font-bold select-none cursor-default'>
            {step === 'phone'
              ? 'Sign In'
              : step === 'otp'
                ? 'Verify Code'
                : 'Set Your Alias'}
          </CardTitle>
          <CardDescription className='mt-2 select-none cursor-default'>
            {step === 'phone'
              ? 'Enter your phone number to receive a verification code'
              : step === 'otp'
                ? `Enter the 6-digit code sent to ${formatPhoneNumber(phoneNumber)}`
                : 'Choose a display name for your poker profile'}
          </CardDescription>
        </CardHeader>
        <CardContent className='px-6 pb-6'>
          {step === 'phone' ? (
            <form
              onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
              className='space-y-6'
            >
              <div className='space-y-4'>
                <Label
                  htmlFor='phone'
                  className='text-sm font-medium mb-4 block'
                >
                  Phone Number
                </Label>
                <PhoneInput
                  {...phoneForm.register('phone')}
                  value={phoneForm.watch('phone')}
                  onChange={(value) => phoneForm.setValue('phone', value)}
                />
                {phoneForm.formState.errors.phone && (
                  <p className='text-sm text-destructive'>
                    {phoneForm.formState.errors.phone.message}
                  </p>
                )}
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
                {loading ? 'Sending...' : 'Send Code'}
              </Button>
            </form>
          ) : step === 'otp' ? (
            <form
              onSubmit={otpForm.handleSubmit(onOTPSubmit)}
              className='space-y-6'
            >
              <div className='space-y-4 text-center'>
                <Label
                  htmlFor='otp'
                  className='text-sm font-medium mb-4 block'
                >
                  Verification Code
                </Label>
                <div className='flex justify-center'>
                  <InputOTP
                    maxLength={6}
                    value={otpForm.watch('otp')}
                    onChange={(value) => otpForm.setValue('otp', value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {otpForm.formState.errors.otp && (
                  <p className='text-sm text-destructive'>
                    {otpForm.formState.errors.otp.message}
                  </p>
                )}
              </div>
              {error && (
                <div className='text-sm text-destructive text-center py-2'>
                  {error}
                </div>
              )}
              <div className='space-y-3'>
                <Button
                  type='submit'
                  className='w-full h-11'
                  disabled={loading || otpForm.watch('otp').length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='w-full h-11'
                  onClick={handleBackToPhone}
                  disabled={loading}
                >
                  Back to Phone Number
                </Button>
              </div>
            </form>
          ) : step === 'alias' ? (
            <form
              onSubmit={aliasForm.handleSubmit(onAliasSubmit)}
              className='space-y-6'
            >
              <div className='space-y-2'>
                <Label
                  htmlFor='alias'
                  className='text-sm font-medium'
                >
                  Display Name
                </Label>
                <Input
                  id='alias'
                  type='text'
                  placeholder='Enter your alias'
                  {...aliasForm.register('alias')}
                  className='h-11'
                  autoComplete='off'
                />
                {aliasForm.formState.errors.alias && (
                  <p className='text-sm text-destructive'>
                    {aliasForm.formState.errors.alias.message}
                  </p>
                )}
              </div>
              {error && (
                <div className='text-sm text-destructive text-center py-2'>
                  {error}
                </div>
              )}
              <div className='space-y-3'>
                <Button
                  type='submit'
                  className='w-full h-11'
                  disabled={loading}
                >
                  {loading ? 'Setting Alias...' : 'Continue'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='w-full h-11'
                  onClick={() => {
                    setStep('otp')
                    setError('')
                    aliasForm.reset()
                  }}
                  disabled={loading}
                >
                  Back to Verification
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
