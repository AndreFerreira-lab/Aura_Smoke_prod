import * as React from 'react'
import { cn } from '../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'
  size?: 'default' | 'sm' | 'lg'
}

const badgeVariants = {
  default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
  secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
  outline: 'text-foreground',
  success: 'border-transparent bg-green-600 text-white hover:bg-green-700',
  warning: 'border-transparent bg-yellow-600 text-white hover:bg-yellow-700',
  info: 'border-transparent bg-blue-600 text-white hover:bg-blue-700',
}

const sizeVariants = {
  default: 'px-2.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-[10px]',
  lg: 'px-3 py-1 text-sm',
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        badgeVariants[variant],
        sizeVariants[size],
        className
      )}
      {...props}
    />
  )
)
Badge.displayName = 'Badge'

export { Badge, badgeVariants }