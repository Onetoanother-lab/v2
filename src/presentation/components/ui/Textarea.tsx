/**
 * PRESENTATION LAYER — Textarea UI Component
 */

import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@presentation/styles/cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
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

        <textarea
          ref={ref}
          id={inputId}
          rows={3}
          className={cn(
            'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
            'transition-all duration-150 outline-none resize-none',
            'border-slate-200 focus:border-brand-400 focus:ring-3 focus:ring-brand-100',
            'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
            'dark:focus:border-brand-500 dark:focus:ring-brand-900/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-100',
            className,
          )}
          {...props}
        />

        {error && <p className="text-xs text-red-500">⚠ {error}</p>}
        {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
