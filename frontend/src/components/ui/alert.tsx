import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

function Alert({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-xl border border-border bg-card px-4 py-3 text-sm',
        className,
      )}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: ComponentProps<'h3'>) {
  return (
    <h3
      className={cn('mb-1 font-semibold leading-none', className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'text-xs leading-5 text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Alert, AlertDescription, AlertTitle }
