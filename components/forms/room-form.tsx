'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Building2,
  Globe,
  Mail,
  MapPin,
  Phone,
  Hash,
  Shield,
  AlertTriangle,
} from 'lucide-react'
import { formatIPRestrictions } from '@/lib/ip-validation'
import { validateIPRestrictionsInput } from '@/lib/room-ip-restrictions'

const roomFormSchema = z.object({
  name: z.string().min(1, 'Room name is required'),
  code: z
    .string()
    .min(1, 'Room code is required')
    .regex(
      /^[a-z0-9-]+$/,
      'Room code must contain only lowercase letters, numbers, and hyphens'
    ),
  website_url: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^https?:\/\/.+/.test(val),
      'Please enter a valid URL starting with http:// or https://'
    ),
  contact_email: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      'Please enter a valid email address'
    ),
  address: z.string().optional(),
  phone: z.string().optional(),
  ip_restriction_enabled: z.boolean().optional(),
  allowed_ips: z.array(z.string()).optional(),
})

type RoomFormData = z.infer<typeof roomFormSchema>

interface RoomFormProps {
  initialData?: Partial<RoomFormData>
  onSubmit: (data: RoomFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  submitLabel?: string
  showSecuritySettings?: boolean
  showActions?: boolean
  isSuperAdmin?: boolean
}

export function RoomForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Create Room',
  showSecuritySettings = false,
  showActions = true,
  isSuperAdmin = false,
}: RoomFormProps): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      code: initialData?.code || '',
      website_url: initialData?.website_url || '',
      contact_email: initialData?.contact_email || '',
      address: initialData?.address || '',
      phone: initialData?.phone || '',
      ip_restriction_enabled: initialData?.ip_restriction_enabled || false,
      allowed_ips: initialData?.allowed_ips || [],
    },
  })

  const watchedCode = watch('code')
  const watchedIPRestrictionEnabled = watch('ip_restriction_enabled')
  const watchedAllowedIPs = watch('allowed_ips')

  const onFormSubmit = async (data: RoomFormData): Promise<void> => {
    try {
      await onSubmit(data)
    } catch (_error) {
      // Error submitting form - handled by error state
    }
  }

  const handleIPRestrictionsChange = (value: string): void => {
    const { validIPs, errors: validationErrors } =
      validateIPRestrictionsInput(value)

    if (validationErrors.length === 0) {
      setValue('allowed_ips', validIPs)
    } else {
      // Keep the current value if there are validation errors
      // The user can see the errors and fix them
    }
  }

  return (
    <form
      id='room-form'
      onSubmit={handleSubmit(onFormSubmit)}
      className='space-y-6'
    >
      <div className='grid gap-6 md:grid-cols-2'>
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Building2 className='h-5 w-5' />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='name'>Room Name *</Label>
              <Input
                id='name'
                {...register('name')}
                placeholder='e.g., The Royal Flush'
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className='text-sm text-red-500'>{errors.name.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='code'>Room Code *</Label>
              <div className='flex items-center gap-2'>
                <Hash className='h-4 w-4 text-muted-foreground' />
                <Input
                  id='code'
                  {...register('code', {
                    onChange: (e) => {
                      e.target.value = e.target.value.toLowerCase()
                    },
                  })}
                  placeholder='e.g., royal-flush'
                  className={errors.code ? 'border-red-500' : ''}
                />
              </div>
              {errors.code && (
                <p className='text-sm text-red-500'>{errors.code.message}</p>
              )}
              <p className='text-xs text-muted-foreground'>
                Used in URLs: /{watchedCode || 'room-code'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Phone className='h-5 w-5' />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='contact_email'>Contact Email</Label>
              <div className='flex items-center gap-2'>
                <Mail className='h-4 w-4 text-muted-foreground' />
                <Input
                  id='contact_email'
                  type='email'
                  {...register('contact_email')}
                  placeholder='contact@room.com'
                  className={errors.contact_email ? 'border-red-500' : ''}
                />
              </div>
              {errors.contact_email && (
                <p className='text-sm text-red-500'>
                  {errors.contact_email.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='phone'>Phone Number</Label>
              <div className='flex items-center gap-2'>
                <Phone className='h-4 w-4 text-muted-foreground' />
                <Input
                  id='phone'
                  {...register('phone')}
                  placeholder='+1-555-0123'
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='website_url'>Website URL</Label>
              <div className='flex items-center gap-2'>
                <Globe className='h-4 w-4 text-muted-foreground' />
                <Input
                  id='website_url'
                  {...register('website_url')}
                  placeholder='https://www.room.com'
                  className={errors.website_url ? 'border-red-500' : ''}
                />
              </div>
              {errors.website_url && (
                <p className='text-sm text-red-500'>
                  {errors.website_url.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='address'>Address</Label>
              <div className='flex items-center gap-2'>
                <MapPin className='h-4 w-4 text-muted-foreground' />
                <Input
                  id='address'
                  {...register('address')}
                  placeholder='123 Main St, City, State'
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings - Show for room operators or superadmin */}
        {(showSecuritySettings || isSuperAdmin) && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Shield className='h-5 w-5' />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='ip_restriction_enabled'
                  checked={watchedIPRestrictionEnabled}
                  onCheckedChange={(checked) =>
                    setValue('ip_restriction_enabled', checked as boolean)
                  }
                />
                <Label
                  htmlFor='ip_restriction_enabled'
                  className='text-sm font-medium'
                >
                  Enable IP restrictions for admin access
                </Label>
              </div>

              {watchedIPRestrictionEnabled && (
                <div className='space-y-3'>
                  <div className='space-y-2'>
                    <Label htmlFor='allowed_ips'>Allowed IP Addresses</Label>
                    <div className='text-sm text-muted-foreground'>
                      Enter IP addresses, CIDR ranges, or wildcard patterns (one
                      per line)
                    </div>
                    <Textarea
                      id='allowed_ips'
                      placeholder='192.168.1.0/24&#10;10.0.0.1&#10;203.0.113.0/24&#10;192.168.2.*'
                      value={formatIPRestrictions(watchedAllowedIPs || null)}
                      onChange={(e) =>
                        handleIPRestrictionsChange(e.target.value)
                      }
                      className='min-h-[120px] font-mono text-sm'
                    />
                    <div className='text-xs text-muted-foreground space-y-1'>
                      <p>
                        <strong>Examples:</strong>
                      </p>
                      <p>
                        • <code>192.168.1.100</code> - Exact IP address
                      </p>
                      <p>
                        • <code>192.168.1.0/24</code> - CIDR range
                        (192.168.1.1-254)
                      </p>
                      <p>
                        • <code>192.168.2.*</code> - Wildcard pattern
                        (192.168.2.1-255)
                      </p>
                    </div>
                  </div>

                  <Alert>
                    <AlertTriangle className='h-4 w-4' />
                    <AlertDescription>
                      <div className='space-y-1'>
                        <p className='font-medium'>Important Security Note:</p>
                        <p className='text-sm'>
                          IP restrictions only apply to admin routes. Players
                          can still access the room from any IP address. Make
                          sure to test your IP restrictions before enabling them
                          in production.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Form Actions */}
      {showActions && (
        <div className='flex justify-end gap-3'>
          <Button
            type='button'
            variant='outline'
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : submitLabel}
          </Button>
        </div>
      )}
    </form>
  )
}
