/**
 * PRESENTATION LAYER — StreakLineChart
 *
 * Area chart showing a habit's cumulative completions over time.
 * Uses Recharts AreaChart. Purely presentational.
 */

import { memo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface StreakDataPoint {
  date:       string
  streak:     number
  cumulative: number
}

interface StreakLineChartProps {
  data:  StreakDataPoint[]
  color?: string
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-white">
        {payload[0].value} day streak
      </p>
    </div>
  )
}

export const StreakLineChart = memo(function StreakLineChart({
  data,
  color = '#22c55e',
}: StreakLineChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        Complete habits to see your streak history
      </div>
    )
  }

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="streakGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(148 163 184 / 0.2)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'rgb(148 163 184)' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'rgb(148 163 184)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="streak"
            stroke={color}
            strokeWidth={2}
            fill="url(#streakGrad)"
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: 'white', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
})
