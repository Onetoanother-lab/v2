/**
 * PRESENTATION LAYER — ViewToggle
 *
 * A segmented control that switches between "List" and "Heatmap" views.
 * Features a sliding pill indicator powered by framer-motion layoutId
 * so the active indicator glides smoothly between segments.
 *
 * Zero business logic — pure controlled component.
 */

import { memo }              from 'react'
import { motion }            from 'framer-motion'
import { LayoutList, Grid2x2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ViewMode = 'list' | 'heatmap'

interface ViewToggleProps {
  value:    ViewMode
  onChange: (mode: ViewMode) => void
}

// ─── Segment definition ───────────────────────────────────────────────────────

const SEGMENTS: Array<{ value: ViewMode; label: string; Icon: React.FC<{ size?: number; className?: string }> }> = [
  { value: 'list',    label: 'List',    Icon: LayoutList },
  { value: 'heatmap', label: 'Heatmap', Icon: Grid2x2   },
]

// ─── Component ────────────────────────────────────────────────────────────────

export const ViewToggle = memo(function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="View mode"
      className={[
        'inline-flex items-center p-1 rounded-xl gap-0.5',
        'bg-slate-100 dark:bg-slate-800',
      ].join(' ')}
    >
      {SEGMENTS.map(({ value: segVal, label, Icon }) => {
        const isActive = segVal === value
        return (
          <button
            key={segVal}
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(segVal)}
            className={[
              'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
              'text-xs font-semibold',
              'transition-colors duration-150 focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-emerald-500',
              isActive
                ? 'text-slate-800 dark:text-slate-100'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300',
            ].join(' ')}
          >
            {/* Sliding background pill */}
            {isActive && (
              <motion.span
                layoutId="view-toggle-pill"
                className="absolute inset-0 rounded-lg bg-white dark:bg-slate-700 shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}

            {/* Icon + label (above the pill via z-index) */}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon size={13} className="shrink-0" aria-hidden />
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
})
