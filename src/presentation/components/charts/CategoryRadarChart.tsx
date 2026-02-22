/**
 * PRESENTATION LAYER — CategoryRadarChart
 *
 * Radar/spider chart showing completion rates across habit categories.
 * Uses Recharts RadarChart. Purely presentational.
 */

import { memo } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

export interface CategoryData {
  category:   string
  rate:       number   // 0–100
  fullMark:   100
}

interface CategoryRadarChartProps {
  data:  CategoryData[]
  color?: string
}

const CATEGORY_EMOJI: Record<string, string> = {
  health: '❤️', fitness: '💪', mindfulness: '🧘',
  learning: '📚', productivity: '⚡', social: '🤝',
  finance: '💰', other: '✨',
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm font-bold text-slate-900 dark:text-white">
        {CATEGORY_EMOJI[d.payload.category] ?? '✨'} {d.payload.category}
      </p>
      <p className="text-xs text-brand-500">{d.value}% completion rate</p>
    </div>
  )
}

export const CategoryRadarChart = memo(function CategoryRadarChart({
  data,
  color = '#22c55e',
}: CategoryRadarChartProps) {
  if (!data.length) return null

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
          <PolarGrid stroke="rgb(148 163 184 / 0.3)" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fontSize: 11, fill: 'rgb(100 116 139)' }}
            tickFormatter={(v) => `${CATEGORY_EMOJI[v] ?? ''} ${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            dataKey="rate"
            stroke={color}
            fill={color}
            fillOpacity={0.18}
            strokeWidth={2}
            dot={{ fill: color, r: 3 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
})
