import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const normalizedValue =
      type === 'number' &&
      Object.prototype.hasOwnProperty.call(props, 'value') &&
      typeof props.value === 'number' &&
      Number.isNaN(props.value)
        ? ''
        : props.value

    const handleFocus: React.FocusEventHandler<HTMLInputElement> = (event) => {
      if (type === 'number' && event.currentTarget.value === '0') {
        event.currentTarget.select()
      }
      props.onFocus?.(event)
    }

    return (
      <input
        type={type}
        className={cn(
          'flex h-[44px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-3 py-2 text-sm',
          'ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-[#9CA3AF]',
          'focus-visible:outline-none focus-visible:border-[#4F46E5] focus-visible:ring-[3px] focus-visible:ring-[#4F46E5]/15',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F3F4F6]',
          'transition-all duration-200',
          className
        )}
        ref={ref}
        {...props}
        value={normalizedValue}
        onFocus={handleFocus}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
