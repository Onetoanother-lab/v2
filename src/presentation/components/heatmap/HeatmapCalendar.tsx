/**
 * PRESENTATION LAYER — HeatmapCalendar
 *
 * The main yearly heatmap grid.  Layout:
 *
 *   Mon │ ░ ░ ▒ ▓ ░ … (52 columns)
 *   Wed │ ░ ▒ ▓ ░ ▒ …
 *   Fri │ ░ ░ ░ ▒ ░ …
 *       Jan  Feb  Mar  …
 *
 * Rendered as a CSS Grid (not SVG) so:
 *  - Tailwind classes work natively
 *  - Dark mode is automatic
 *  - No canvas / SVG coordinate math
 *  - Overflow-x scroll on small screens
 *
 * Performance:
 *  - Component is memoized — only re-renders when heatmapData changes
 *  - DayCell is also memoized — 365 cells, no wasted renders
 *  - Staggered entrance animation: cells animate in column by column
 *    using CSS animation-delay driven by week index
 */

import { memo, useState }        from 'react'
import { motion }                from 'framer-motion'
import { DayCell }               from './DayCell'
import type { HeatmapData }      from '@application/selectors/heatmapSelectors'

// ─── Day-of-week labels (Sun=0 … Sat=6) ───────────────────────────────────────
// We show Mon, Wed, Fri to avoid crowding
const DOW_LABELS: Record<number, string> = {
  1: 'Mon',
  3: 'Wed',
  5: 'Fri',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface HeatmapCalendarProps {
  data:      HeatmapData
  onDayClick?: (dateStr: string) => void
  /** px size for each cell. Default 12 */
  cellSize?: number
  /** Gap between cells in px. Default 3 */
  gap?: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export const HeatmapCalendar = memo(function HeatmapCalendar({
  data,
  onDayClick,
  cellSize = 12,
  gap = 3,
}: HeatmapCalendarProps) {
  const { weeks, months, activeDays, bestRatio } = data

  // Column width = cell + gap
  const colW = cellSize + gap

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="space-y-4"
    >
      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
        <span>
          <strong className="text-slate-800 dark:text-slate-200 font-semibold tabular-nums">
            {activeDays}
          </strong>
          {' '}active days in the past year
        </span>
        {bestRatio > 0 && (
          <span>
            Best day:{' '}
            <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {Math.round(bestRatio * 100)}%
            </strong>
          </span>
        )}
      </div>

      {/* ── Scrollable grid container ─────────────────────────────────────── */}
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div style={{ minWidth: weeks.length * colW + 32 }}>

          {/* Month labels row */}
          <div
            className="flex mb-1 ml-8"
            style={{ gap: 0 }}
          >
            {months.map((m, i) => {
              // Only render if there's enough space to avoid overlap
              const nextCol = months[i + 1]?.colIndex ?? weeks.length
              const spanCols = nextCol - m.colIndex
              if (spanCols < 3) return null
              return (
                <div
                  key={`${m.label}-${m.colIndex}`}
                  className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0"
                  style={{ width: m.colIndex * colW, minWidth: m.colIndex === 0 ? 0 : colW * spanCols }}
                >
                  {m.colIndex === 0 ? null : m.label}
                </div>
              )
            })}
          </div>

          {/* Grid: DOW labels + week columns */}
          <div className="flex gap-0">
            {/* Day-of-week labels (left column) */}
            <div
              className="flex flex-col mr-2 shrink-0"
              style={{ gap, marginTop: 0 }}
            >
              {Array.from({ length: 7 }).map((_, dow) => (
                <div
                  key={dow}
                  className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-end pr-1"
                  style={{ height: cellSize, lineHeight: 1 }}
                >
                  {DOW_LABELS[dow] ?? ''}
                </div>
              ))}
            </div>

            {/* Week columns */}
            <div className="flex" style={{ gap }}>
              {weeks.map((week, wi) => (
                <motion.div
                  key={week.weekIndex}
                  className="flex flex-col"
                  style={{ gap }}
                  // Staggered entrance: each column fades in 8ms after the previous
                  initial={{ opacity: 0, scaleY: 0.8 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  transition={{
                    duration:  0.2,
                    ease:      'easeOut',
                    delay:     wi * 0.004,   // 4ms per column stagger
                  }}
                >
                  {week.days.map((day, di) =>
                    day ? (
                      <DayCell
                        key={day.date}
                        day={day}
                        size={cellSize}
                        onClick={onDayClick}
                      />
                    ) : (
                      // Null padding cell (before the grid starts mid-week)
                      <div
                        key={`pad-${di}`}
                        style={{ width: cellSize, height: cellSize }}
                      />
                    ),
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── Legend ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-1.5 mt-3 ml-8">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 mr-1">Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                style={{ width: cellSize, height: cellSize }}
                className={[
                  'rounded-sm',
                  level === 0 ? 'bg-slate-100 dark:bg-slate-800' : '',
                  level === 1 ? 'bg-emerald-100 dark:bg-emerald-900/50' : '',
                  level === 2 ? 'bg-emerald-300 dark:bg-emerald-700' : '',
                  level === 3 ? 'bg-emerald-500 dark:bg-emerald-500' : '',
                  level === 4 ? 'bg-emerald-600 dark:bg-emerald-400' : '',
                ].filter(Boolean).join(' ')}
              />
            ))}
            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">More</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
})
