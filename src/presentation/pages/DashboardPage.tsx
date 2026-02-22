/**
 * PRESENTATION LAYER — DashboardPage (Phase 2 — Real Data)
 *
 * Reads aggregated stats from the habits store populated by useHabits.
 * No business logic — all computation happens in use cases / StreakCalculator.
 */

import { useEffect }  from 'react'
import { Flame, Target, TrendingUp, Calendar } from 'lucide-react'
import { useHabits }  from '@presentation/hooks/useHabits'
import { cn }         from '@presentation/styles/cn'

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon:    React.ReactNode
  label:   string
  value:   React.ReactNode
  sub:     string
  color:   string
  isLoading?: boolean
}

function StatCard({ icon, label, value, sub, color, isLoading }: StatCardProps) {
  return (
    <div className="card p-5 hover:shadow-md transition-shadow duration-200">
      <div className={cn('mb-3 inline-flex rounded-xl p-2.5', color)}>
        {icon}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 font-display text-3xl font-bold text-slate-900 dark:text-white">
        {isLoading ? (
          <span className="inline-block h-8 w-16 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
        ) : (
          value
        )}
      </p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  )
}

// ─── Mini habit row for "today's habits" overview ─────────────────────────────

function MiniHabitRow({ name, icon, isCompleted, color }: {
  name: string
  icon: string
  isCompleted: boolean
  color: string
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
      <span className="text-base flex-shrink-0" role="img" aria-hidden>{icon}</span>
      <span className={cn(
        'flex-1 text-sm truncate',
        isCompleted
          ? 'line-through text-slate-400 dark:text-slate-500'
          : 'text-slate-700 dark:text-slate-300',
      )}>
        {name}
      </span>
      <span
        className={cn(
          'h-2 w-2 rounded-full flex-shrink-0',
          isCompleted ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-600',
        )}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { habits, completedIds, isLoading, fetchHabits, selectedDate } = useHabits()

  useEffect(() => { fetchHabits() }, [fetchHabits])

  // Derived stats — display logic only, all numbers come from use case
  const dueHabits     = habits.filter((h: any) => h.isDueToday !== false)
  const doneCount     = dueHabits.filter((h: any) => completedIds.has(h.id)).length
  const totalHabits   = habits.length
  const bestStreak    = habits.reduce((max: number, h: any) => Math.max(max, h.currentStreak ?? 0), 0)
  const avgRate       = habits.length > 0
    ? Math.round(habits.reduce((sum: number, h: any) => sum + (h.completionRateLastMonth ?? 0), 0) / habits.length * 100)
    : 0

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="mx-auto max-w-3xl space-y-8">

      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <div>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          {greeting} 👋
        </p>
        <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
          {doneCount === dueHabits.length && dueHabits.length > 0
            ? "You're on fire today! 🔥"
            : 'Ready to build great habits?'}
        </h2>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<Flame size={18} className="text-orange-600" />}
          label="Best Streak"
          value={`${bestStreak}`}
          sub={bestStreak === 1 ? 'day in a row' : 'days in a row'}
          color="bg-orange-50 dark:bg-orange-900/20"
          isLoading={isLoading}
        />
        <StatCard
          icon={<Target size={18} className="text-brand-600" />}
          label="Today"
          value={`${doneCount}/${dueHabits.length}`}
          sub="habits done"
          color="bg-brand-50 dark:bg-brand-900/20"
          isLoading={isLoading}
        />
        <StatCard
          icon={<TrendingUp size={18} className="text-sky-600" />}
          label="30-Day Rate"
          value={`${avgRate}%`}
          sub="completion average"
          color="bg-sky-50 dark:bg-sky-900/20"
          isLoading={isLoading}
        />
        <StatCard
          icon={<Calendar size={18} className="text-violet-600" />}
          label="Total Habits"
          value={`${totalHabits}`}
          sub="tracked habits"
          color="bg-violet-50 dark:bg-violet-900/20"
          isLoading={isLoading}
        />
      </div>

      {/* ── Today's overview ─────────────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
          Today's habits
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          {selectedDate}
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
            ))}
          </div>
        ) : dueHabits.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            No habits scheduled for today
          </p>
        ) : (
          <div>
            {dueHabits.map((h: any) => (
              <MiniHabitRow
                key={h.id}
                name={h.name}
                icon={h.icon ?? '✅'}
                isCompleted={completedIds.has(h.id)}
                color={h.color}
              />
            ))}
          </div>
        )}

        {/* Progress summary */}
        {dueHabits.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {doneCount} of {dueHabits.length} completed
            </span>
            <div className="flex-1 mx-4 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-700"
                style={{ width: dueHabits.length > 0 ? `${(doneCount / dueHabits.length) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-xs font-medium text-brand-500 tabular-nums">
              {dueHabits.length > 0 ? Math.round((doneCount / dueHabits.length) * 100) : 0}%
            </span>
          </div>
        )}
      </div>

    </div>
  )
}
