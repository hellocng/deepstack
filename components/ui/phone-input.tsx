'use client'

import * as React from 'react'
import { cn, formatPhoneNumber } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
      const input = e.target.value
      const formatted = formatPhoneNumber(input)
      onChange?.(formatted)
    }

    return (
      <Input
        type='tel'
        className={cn('h-11', className)}
        ref={ref}
        value={value}
        onChange={handleChange}
        maxLength={17} // +1 (xxx) xxx-xxxx format
        {...props}
      />
    )
  }
)
PhoneInput.displayName = 'PhoneInput'

export { PhoneInput }
