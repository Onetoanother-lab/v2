/**
 * PRESENTATION LAYER — CompletionHeatmap
 *
 * GitHub-style contribution heatmap showing the last 16 weeks.
 * No external chart lib — pure CSS grid + Tailwind.
 * Purely presentational. Receives data as props.
 *
 * Render optimization: React.memo + stable prop shape.
 */

import { memo } from 'react'
import { cn } from '@presentation/styles/cn'

export interface HeatmapDay {
  date:        string   // YYYY-MM-DD
  count:       number   // completions on that day
  isToday:     boolean
}

interface CompletionHeatmapProps {
  days:  HeatmapDay[]
  color?: string
}

const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function intensityClass(count: number, max: number, color: string): string {
  if (count === 0) return 'bg-slate-100 dark:bg-slate-800'
  const ratio = count / Math.max(max, 1)
  if (ratio <= 0.25) return 'opacity-30'
  if (ratio <= 0.5)  return 'opacity-55'
  if (ratio <= 0.75) return 'opacity-80'
  return ''   // full opacity
}

export const CompletionHeatmap = memo(function CompletionHeatmap({
  days,
  color = '#22c55e',
}: CompletionHeatmapProps) {
  if (!days.length) return null

  const maxCount = Math.max(...days.map((d) => d.count), 1)

  // Group into weeks (columns of 7)
  const weeks: HeatmapDay[][] = []
  let currentWeek: HeatmapDay[] = []

  // Pad start so first day aligns to correct weekday
  const firstDate  = new Date(days[0].date + 'T00:00:00')
  const startPad   = firstDate.getUTCDay() // 0=Sun
  for (let i = 0; i < startPad; i++) currentWeek.push({ date: '', count: -1, isToday: false })

  for (const day of days) {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length) weeks.push(currentWeek)

  // Build month labels (show month name when month changes)
  const monthLabels: { col: number; label: string }[] = []
  let lastMonth = -1
  weeks.forEach((week, col) => {
    const firstReal = week.find((d) => d.date && d.count >= 0)
    if (firstReal) {
      const month = new Date(firstReal.date + 'T00:00:00').getUTCMonth()
      if (month !== lastMonth) {
        monthLabels.push({ col, label: MONTH_ABBR[month] })
        lastMonth = month
      }
    }
  })

  return (
    <div className="space-y-2">
      {/* Month labels */}
      <div className="flex gap-[3px] pl-8">
        {weeks.map((_, col) => {
          const ml = monthLabels.find((m) => m.col === col)
          return (
            <div key={col} className="w-3 flex-shrink-0 text-[10px] text-slate-400">
              {ml?.label ?? ''}
            </div>
          )
        })}
      </div>

      {/* Grid */}
      <div className="flex gap-1">
        {/* Weekday labels */}
        <div className="flex flex-col gap-[3px] pt-0.5">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className="h-3 text-[10px] leading-3 text-slate-400 text-right pr-1 w-6">
              {label}
            </div>
          ))}
        </div>

        {/* Week columns */}
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => {
                if (day.count === -1) {
                  return <div key={di} className="h-3 w-3" />
                }
                if (!day.date) {
                  return <div key={di} className="h-3 w-3 rounded-sm bg-slate-100 dark:bg-slate-800 opacity-0" />
                }
                return (
                  <div
                    key={di}
                    title={`${day.date}: ${day.count} completion${day.count !== 1 ? 's' : ''}`}
                    className={cn(
                      'h-3 w-3 rounded-sm transition-transform hover:scale-125 cursor-default',
                      day.count === 0
                        ? 'bg-slate-100 dark:bg-slate-800'
                        : intensityClass(day.count, maxCount, color),
                      day.isToday && 'ring-1 ring-offset-1 ring-brand-400',
                    )}
                    style={day.count > 0 ? { backgroundColor: color } : undefined}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 pl-8 pt-1">
        <span className="text-[10px] text-slate-400">Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((opacity, i) => (
          <div
            key={i}
            className="h-3 w-3 rounded-sm"
            style={opacity === 0
              ? { backgroundColor: 'rgb(241 245 249)' }
              : { backgroundColor: color, opacity }
            }
          />
        ))}
        <span className="text-[10px] text-slate-400">More</span>
      </div>
    </div>
  )
})
