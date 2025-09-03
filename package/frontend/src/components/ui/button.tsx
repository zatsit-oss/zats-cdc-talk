import * as React from 'react'
import { cn } from '../../lib/cn'

type Variant = 'default' | 'outline' | 'ghost' | 'link'
type Size = 'default' | 'sm' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'

const variantClasses: Record<Variant, string> = {
  default: 'bg-primary text-white hover:bg-indigo-600',
  outline: 'border border-slate-200 bg-transparent hover:bg-slate-100',
  ghost: 'bg-transparent hover:bg-slate-100',
  link: 'bg-transparent underline-offset-4 hover:underline text-primary',
}

const sizeClasses: Record<Size, string> = {
  default: 'h-10 py-2 px-4',
  sm: 'h-8 px-3 text-sm',
  lg: 'h-12 px-6',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  const classes = cn(base, variantClasses[variant], sizeClasses[size], className)
  return <button ref={ref} className={classes} {...props} />
})
Button.displayName = 'Button'
