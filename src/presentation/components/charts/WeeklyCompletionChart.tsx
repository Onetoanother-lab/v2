/**
 * PRESENTATION LAYER — WeeklyCompletionChart
 *
 * Bar chart showing completion rate per day for the past 4 weeks.
 * Uses Recharts. Purely presentational — receives data as props.
 *
 * Render optimization:
 *   Wrapped in React.memo. Only re-renders when chartData changes.
 *   Recharts components are internally memo'd.
 */

import { memo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export interface DayChartData {
  date:        string   // 'Mon 1', 'Tue 2', etc.
  rate:        number   // 0–1
  completed:   number
  total:       number
  isToday:     boolean
}

interface WeeklyCompletionChartProps {
  data:  DayChartData[]
  color?: string
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as DayChartData
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
        {d.completed} / {d.total} habits
      </p>
      <p className="text-xs text-brand-500">{Math.round(d.rate * 100)}% complete</p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export const WeeklyCompletionChart = memo(function WeeklyCompletionChart({
  data,
  color = '#22c55e',
}: WeeklyCompletionChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        No data yet — complete some habits!
      </div>
    )
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barSize={10} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgb(148 163 184 / 0.2)"
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'rgb(148 163 184)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
            tick={{ fontSize: 11, fill: 'rgb(148 163 184)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgb(148 163 184 / 0.1)' }} />
          <Bar dataKey="rate" radius={[4, 4, 2, 2]}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.isToday ? color : entry.rate > 0.8 ? color : entry.rate > 0.5 ? `${color}99` : 'rgb(226 232 240)'}
                opacity={entry.isToday ? 1 : 0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})
