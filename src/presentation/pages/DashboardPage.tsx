/**
 * PRESENTATION LAYER — Dashboard Page (Placeholder)
 */

import { Flame, Target, TrendingUp, Calendar } from 'lucide-react'

interface StatCardProps {
  icon:  React.ReactNode
  label: string
  value: string
  sub:   string
  color: string
}

function StatCard({ icon, label, value, sub, color }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className={`mb-3 inline-flex rounded-xl p-2.5 ${color}`}>
        {icon}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 font-display text-3xl font-700 text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  )
}

export function DashboardPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Good morning 👋
        </p>
        <h2 className="font-display text-3xl font-700 text-slate-900 dark:text-white">
          Ready to build great habits?
        </h2>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<Flame size={18} className="text-orange-600" />}
          label="Current Streak"
          value="—"
          sub="days in a row"
          color="bg-orange-50 dark:bg-orange-900/20"
        />
        <StatCard
          icon={<Target size={18} className="text-brand-600" />}
          label="Today"
          value="0/0"
          sub="habits done"
          color="bg-brand-50 dark:bg-brand-900/20"
        />
        <StatCard
          icon={<TrendingUp size={18} className="text-sky-600" />}
          label="This Week"
          value="—%"
          sub="completion rate"
          color="bg-sky-50 dark:bg-sky-900/20"
        />
        <StatCard
          icon={<Calendar size={18} className="text-violet-600" />}
          label="Total Days"
          value="—"
          sub="tracked so far"
          color="bg-violet-50 dark:bg-violet-900/20"
        />
      </div>

      {/* Placeholder chart area */}
      <div className="card flex h-48 items-center justify-center text-slate-300 dark:text-slate-700">
        <p className="text-sm font-medium">
          📊 Weekly chart coming in Phase 2
        </p>
      </div>
    </div>
  )
}
