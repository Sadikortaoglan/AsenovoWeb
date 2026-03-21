import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderActionGroupProps {
  primaryAction: ReactNode
  secondaryAction?: ReactNode
  tertiaryAction?: ReactNode
  className?: string
}

export function PageHeaderActionGroup({
  primaryAction,
  secondaryAction,
  tertiaryAction,
  className,
}: PageHeaderActionGroupProps) {
  const hasSecondary = Boolean(secondaryAction)
  const hasTertiary = Boolean(tertiaryAction)

  return (
    <div className={cn('w-full lg:w-auto', className)}>
      <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto lg:flex-row lg:items-center lg:justify-end">
        <div className="col-span-2 lg:order-3 lg:col-auto">{primaryAction}</div>

        {secondaryAction ? (
          <div
            className={cn(
              'lg:order-2 lg:col-auto',
              !hasTertiary ? 'col-span-2' : 'col-span-1',
            )}
          >
            {secondaryAction}
          </div>
        ) : null}

        {tertiaryAction ? (
          <div
            className={cn(
              'lg:order-1 lg:col-auto',
              !hasSecondary ? 'col-span-2' : 'col-span-1',
            )}
          >
            {tertiaryAction}
          </div>
        ) : null}
      </div>
    </div>
  )
}
