/**
 * PRESENTATION LAYER — Input UI Component
 *
 * Purely presentational. Zero business logic.
 * Supports label, error state, prefix icon, helper text.
 */

import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@presentation/styles/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  prefixIcon?: React.ReactNode
  suffixIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefixIcon, suffixIcon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {prefixIcon && (
            <span className="pointer-events-none absolute left-3 text-slate-400">
              {prefixIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
              'transition-all duration-150 outline-none',
              'border-slate-200 focus:border-brand-400 focus:ring-3 focus:ring-brand-100',
              'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
              'dark:focus:border-brand-500 dark:focus:ring-brand-900/30',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-400 focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-900/30',
              prefixIcon && 'pl-9',
              suffixIcon && 'pr-9',
              className,
            )}
            {...props}
          />

          {suffixIcon && (
            <span className="pointer-events-none absolute right-3 text-slate-400">
              {suffixIcon}
            </span>
          )}
        </div>

        {error && (
          <p className="flex items-center gap-1 text-xs text-red-500">
            <span>⚠</span> {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-slate-400">{hint}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
