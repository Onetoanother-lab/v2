/**
 * PRESENTATION LAYER — DayCell
 *
 * A single cell in the heatmap grid. Renders:
 *  - A colored square based on completion level (0–4)
 *  - A rich tooltip on hover showing date, counts, and percentage
 *  - A subtle ring highlight for "today"
 *
 * Performance:
 *  - Fully memoized via React.memo — only re-renders when the day or
 *    onClick reference changes. With 365 cells in the grid this matters.
 *  - Tooltip is rendered with CSS (no portal, no state) — no re-render
 *    cascade from hover events.
 *  - Color classes are computed once and cached in the LEVEL_CLASSES map.
 *
 * Accessibility:
 *  - role="gridcell", aria-label with date and completion info
 *  - Keyboard focusable; Enter/Space fires onClick
 */

import { memo, useCallback, KeyboardEvent } from 'react'
import type { HeatmapDay }                  from '@application/selectors/heatmapSelectors'

// ─── Color system ─────────────────────────────────────────────────────────────
//
// 5 levels × 2 modes (light / dark).
// Uses explicit Tailwind classes (not dynamic strings) so the purge step
// always finds them.  We use emerald as the base hue — it fits the
// "healthy habits" domain better than GitHub's generic green.

const LEVEL_CLASSES: Record<number, string> = {
  0: 'bg-slate-100 dark:bg-slate-800',
  1: 'bg-emerald-100 dark:bg-emerald-900/50',
  2: 'bg-emerald-300 dark:bg-emerald-700',
  3: 'bg-emerald-500 dark:bg-emerald-500',
  4: 'bg-emerald-600 dark:bg-emerald-400',
}

const LEVEL_OPACITY_FUTURE = 'opacity-30'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
    year:    'numeric',
  })
}

function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DayCellProps {
  day:     HeatmapDay
  size?:   number    // px, default 12
  onClick?: (dateStr: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DayCell = memo(function DayCell({ day, size = 12, onClick }: DayCellProps) {
  const isClickable = !day.isFuture && !!onClick

  const handleClick = useCallback(() => {
    if (isClickable) onClick!(day.date)
  }, [isClickable, onClick, day.date])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (isClickable) onClick!(day.date)
      }
    },
    [isClickable, onClick, day.date],
  )

  const colorClass = LEVEL_CLASSES[day.level]
  const sizeStyle  = { width: size, height: size, minWidth: size }

  // Build aria-label
  const ariaLabel = day.isFuture
    ? formatDate(day.date)
    : day.completedCount === 0
    ? `${formatDate(day.date)} — no completions`
    : `${formatDate(day.date)} — ${day.completedCount} of ${day.dueCount} habits, ${pct(day.ratio)}`

  return (
    <div className="relative group/cell">
      <button
        role="gridcell"
        aria-label={ariaLabel}
        tabIndex={isClickable ? 0 : -1}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        style={sizeStyle}
        className={[
          'rounded-sm transition-all duration-100',
          colorClass,
          day.isFuture ? LEVEL_OPACITY_FUTURE : '',
          day.isToday
            ? 'ring-2 ring-offset-1 ring-emerald-500 dark:ring-emerald-400 dark:ring-offset-slate-900'
            : '',
          isClickable
            ? 'cursor-pointer hover:brightness-125 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500'
            : 'cursor-default',
        ].filter(Boolean).join(' ')}
      />

      {/* ── Tooltip ──────────────────────────────────────────────────────── */}
      {!day.isFuture && (
        <div
          aria-hidden
          className={[
            // Position: above the cell, centered
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
            // Layout
            'flex flex-col gap-0.5 min-w-max px-3 py-2 rounded-xl',
            // Appearance
            'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900',
            'shadow-xl shadow-black/20',
            'text-xs leading-relaxed',
            // Show only on hover
            'pointer-events-none',
            'opacity-0 group-hover/cell:opacity-100',
            'scale-95 group-hover/cell:scale-100',
            'transition-all duration-150 ease-out',
          ].join(' ')}
        >
          {/* Date */}
          <span className="font-semibold text-[11px] whitespace-nowrap">
            {formatDate(day.date)}
          </span>

          {/* Stats */}
          {day.dueCount > 0 ? (
            <span className="text-slate-300 dark:text-slate-600 whitespace-nowrap">
              {day.completedCount} / {day.dueCount} habits
              {' · '}
              <span className={day.ratio >= 0.75 ? 'text-emerald-400 dark:text-emerald-600 font-semibold' : ''}>
                {pct(day.ratio)}
              </span>
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">No habits tracked</span>
          )}

          {/* Today badge */}
          {day.isToday && (
            <span className="mt-0.5 text-emerald-400 dark:text-emerald-600 font-medium text-[10px] uppercase tracking-wider">
              Today
            </span>
          )}

          {/* Tooltip caret */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-100" />
        </div>
      )}
    </div>
  )
})
