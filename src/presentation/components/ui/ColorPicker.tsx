/**
 * PRESENTATION LAYER — ColorPicker
 *
 * Swatch-grid color picker. Purely presentational.
 * Calls onChange with the selected hex string.
 */

import { cn } from '@presentation/styles/cn'

const PALETTE = [
  '#22c55e', // brand green
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#eab308', // yellow
  '#ef4444', // red
  '#64748b', // slate
  '#14b8a6', // teal
  '#f59e0b', // amber
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <span className="block text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-2">
        {PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={color}
            onClick={() => onChange(color)}
            className={cn(
              'h-7 w-7 rounded-full transition-all duration-150',
              'ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
              value === color
                ? 'ring-2 scale-110'
                : 'hover:scale-110 opacity-70 hover:opacity-100',
            )}
            style={{ backgroundColor: color, '--tw-ring-color': color } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}
