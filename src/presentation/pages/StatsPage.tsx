/**
 * PRESENTATION LAYER — StatsPage
 *
 * Full statistics page:
 *   • Weekly completion bar chart (last 28 days)
 *   • Contribution heatmap (last 16 weeks)
 *   • Per-habit streak line chart
 *   • Category radar chart
 *   • Badge gallery with gamification store
 *   • Level card
 *
 * All data derivation happens here (display logic only).
 * Business calculations happen in StreakCalculator / GamificationEngine.
 *
 * ─── Render optimization ───────────────────────────────────────────────────────
 * • Charts are lazy-loaded (code splitting) — reduces initial bundle
 * • All chart data is derived once from store, memoized with useMemo
 * • Individual chart components are React.memo'd
 * • useDeferredValue for expensive heatmap computation
 */

import { useEffect, useMemo, lazy, Suspense } from 'react'
import { useHabits }           from '@presentation/hooks/useHabits'
import { useGamification }     from '@presentation/hooks/useGamification'
import { LevelCard }           from '@presentation/components/gamification/LevelCard'
import { BadgeGrid }           from '@presentation/components/gamification/BadgeGrid'

// ── Lazy-loaded chart components ────────────────────────────────────────────
const WeeklyCompletionChart = lazy(() =>
  import('@presentation/components/charts/WeeklyCompletionChart').then((m) => ({ default: m.WeeklyCompletionChart })),
)
const CompletionHeatmap = lazy(() =>
  import('@presentation/components/charts/CompletionHeatmap').then((m) => ({ default: m.CompletionHeatmap })),
)
const StreakLineChart = lazy(() =>
  import('@presentation/components/charts/StreakLineChart').then((m) => ({ default: m.StreakLineChart })),
)
const CategoryRadarChart = lazy(() =>
  import('@presentation/components/charts/CategoryRadarChart').then((m) => ({ default: m.CategoryRadarChart })),
)

function ChartSkeleton({ height = 'h-52' }: { height?: string }) {
  return (
    <div className={`${height} w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800`} />
  )
}

// ─── Data derivation helpers (display-only) ────────────────────────────────

function buildWeeklyData(habits: any[], entries: any[], today: string) {
  const days = []
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today + 'T00:00:00')
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const label   = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }).replace(',', '')

    const dueHabits = habits.filter((h: any) => h.isDueToday !== false)
    const dayEntries = entries.filter((e: any) => e.date === dateStr)
    const completed  = dayEntries.length
    const total      = Math.max(dueHabits.length, 1)

    days.push({
      date:      label,
      rate:      completed / total,
      completed,
      total,
      isToday:   dateStr === today,
    })
  }
  return days
}

function buildHeatmapData(entries: any[], today: string) {
  const days = []
  const completionMap = new Map<string, number>()
  for (const e of entries) {
    completionMap.set(e.date, (completionMap.get(e.date) ?? 0) + 1)
  }

  for (let i = 111; i >= 0; i--) {
    const d = new Date(today + 'T00:00:00')
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    days.push({
      date:    dateStr,
      count:   completionMap.get(dateStr) ?? 0,
      isToday: dateStr === today,
    })
  }
  return days
}

function buildStreakData(entries: any[], habitId: string) {
  const habitEntries = entries
    .filter((e: any) => e.habitId === habitId)
    .sort((a: any, b: any) => a.date.localeCompare(b.date))

  let streak = 0
  let lastDate = ''
  return habitEntries.slice(-30).map((e: any, i: number) => {
    const isConsecutive = lastDate
      ? daysBetween(lastDate, e.date) === 1
      : true
    streak = isConsecutive ? streak + 1 : 1
    lastDate = e.date
    return {
      date:       e.date.slice(5),   // MM-DD
      streak,
      cumulative: i + 1,
    }
  })
}

function buildCategoryData(habits: any[]) {
  const byCategory = new Map<string, { total: number; rate: number }>()
  for (const h of habits) {
    const cat = h.category
    const existing = byCategory.get(cat) ?? { total: 0, rate: 0 }
    byCategory.set(cat, {
      total: existing.total + 1,
      rate:  existing.rate + (h.completionRateLastMonth ?? 0),
    })
  }
  return [...byCategory.entries()].map(([category, { total, rate }]) => ({
    category,
    rate:     Math.round((rate / total) * 100),
    fullMark: 100 as const,
  }))
}

function daysBetween(a: string, b: string): number {
  return Math.abs(
    Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000),
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function StatsPage() {
  const { habits, entries, isLoading, fetchHabits, selectedDate } = useHabits()
  const {
    totalPoints, level, levelName, levelEmoji,
    progressToNext, nextLevelPoints, unlockedBadges,
  } = useGamification()

  useEffect(() => { fetchHabits() }, [fetchHabits])

  // Memoized chart data — recomputed only when habits/entries change
  const weeklyData   = useMemo(() => buildWeeklyData(habits, entries, selectedDate), [habits, entries, selectedDate])
  const heatmapData  = useMemo(() => buildHeatmapData(entries, selectedDate), [entries, selectedDate])
  const categoryData = useMemo(() => buildCategoryData(habits), [habits])

  // Pick the habit with the highest total completions for the streak chart
  const topHabit = useMemo(() => {
    return [...habits].sort((a: any, b: any) => (b.totalCompletions ?? 0) - (a.totalCompletions ?? 0))[0] as any
  }, [habits])

  const streakData = useMemo(() => {
    if (!topHabit) return []
    return buildStreakData(entries, topHabit.id)
  }, [topHabit, entries])

  // Overall stats
  const totalCompletions  = entries.length
  const bestStreak        = Math.max(0, ...habits.map((h: any) => h.currentStreak ?? 0))
  const avgRate           = habits.length > 0
    ? Math.round(habits.reduce((s: number, h: any) => s + (h.completionRateLastMonth ?? 0), 0) / habits.length * 100)
    : 0

  return (
    <div className="mx-auto max-w-3xl space-y-8">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Statistics
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Your progress over the last 30 days
        </p>
      </div>

      {/* ── Top stats row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Completions', value: totalCompletions, suffix: '' },
          { label: 'Best Streak',       value: bestStreak,       suffix: ' days' },
          { label: '30-Day Rate',       value: avgRate,          suffix: '%' },
        ].map(({ label, value, suffix }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className="font-display text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
              {isLoading
                ? <span className="inline-block h-8 w-12 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                : `${value}${suffix}`
              }
            </p>
          </div>
        ))}
      </div>

      {/* ── Level + XP ──────────────────────────────────────────────────── */}
      <LevelCard
        level={level}
        levelName={levelName}
        levelEmoji={levelEmoji}
        totalPoints={totalPoints}
        nextLevelPoints={nextLevelPoints}
        progressToNext={progressToNext}
      />

      {/* ── Weekly completion chart ──────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Daily Completion (Last 28 Days)
        </h3>
        <Suspense fallback={<ChartSkeleton />}>
          {isLoading ? <ChartSkeleton /> : <WeeklyCompletionChart data={weeklyData} />}
        </Suspense>
      </div>

      {/* ── Contribution heatmap ─────────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Activity Heatmap (Last 16 Weeks)
        </h3>
        <Suspense fallback={<ChartSkeleton height="h-32" />}>
          {isLoading ? <ChartSkeleton height="h-32" /> : <CompletionHeatmap days={heatmapData} />}
        </Suspense>
      </div>

      {/* ── Streak chart for top habit ───────────────────────────────────── */}
      {topHabit && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
            Streak History
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {topHabit.icon} {topHabit.name} — last 30 completions
          </p>
          <Suspense fallback={<ChartSkeleton height="h-40" />}>
            {isLoading ? <ChartSkeleton height="h-40" /> : (
              <StreakLineChart data={streakData} color={topHabit.color} />
            )}
          </Suspense>
        </div>
      )}

      {/* ── Category breakdown ───────────────────────────────────────────── */}
      {categoryData.length >= 3 && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Category Breakdown
          </h3>
          <Suspense fallback={<ChartSkeleton height="h-56" />}>
            {isLoading ? <ChartSkeleton height="h-56" /> : <CategoryRadarChart data={categoryData} />}
          </Suspense>
        </div>
      )}

      {/* ── Badges ──────────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">
            Achievements
          </h3>
          <span className="text-xs text-slate-400">
            {unlockedBadges.length} / 18 unlocked
          </span>
        </div>
        <BadgeGrid unlockedBadges={unlockedBadges} showLocked />
      </div>

    </div>
  )
}
