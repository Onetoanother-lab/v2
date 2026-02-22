/**
 * PRESENTATION LAYER — Select UI Component
 *
 * Styled native select — accessible, keyboard-friendly, zero JS logic.
 */

import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@presentation/styles/cn'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, ...props }, ref) => {
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

        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              'w-full appearance-none rounded-xl border bg-white px-3 py-2.5 pr-9',
              'text-sm text-slate-900 transition-all duration-150 outline-none cursor-pointer',
              'border-slate-200 focus:border-brand-400 focus:ring-3 focus:ring-brand-100',
              'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
              'dark:focus:border-brand-500 dark:focus:ring-brand-900/30',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-400 focus:border-red-400 focus:ring-red-100',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>

        {error && <p className="text-xs text-red-500">⚠ {error}</p>}
        {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    )
  },
)

Select.displayName = 'Select'
