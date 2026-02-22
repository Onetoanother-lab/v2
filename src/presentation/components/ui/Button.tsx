/**
 * PRESENTATION LAYER — Button UI Component
 *
 * Primitive button with variant + size system.
 * All business logic stays out; purely presentational.
 */

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@presentation/styles/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-brand-500 hover:bg-brand-600 text-white shadow-sm',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100',
  ghost:     'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
  danger:    'bg-red-500 hover:bg-red-600 text-white shadow-sm',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8  px-3  text-sm  gap-1.5',
  md: 'h-10 px-4  text-sm  gap-2',
  lg: 'h-12 px-6  text-base gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-body font-medium',
        'transition-all duration-150 active:scale-[0.97]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  ),
)

Button.displayName = 'Button'
