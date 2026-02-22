/**
 * PRESENTATION LAYER — HabitList
 *
 * Renders the filtered, sorted list of HabitCards.
 * Purely presentational — receives data and callbacks as props.
 *
 * Render optimization:
 *   • List is virtualization-ready (items keyed by ID).
 *   • Each HabitCard is memo-wrapped, so only changed cards re-render.
 *   • Filtering (due-today vs all) is done by the parent — not here.
 */

import { HabitCard }   from './HabitCard'
import { EmptyState }  from '@presentation/components/ui/EmptyState'
import { Button }      from '@presentation/components/ui/Button'
import { Plus }        from 'lucide-react'

interface HabitItem {
  id: string
  name: string
  description?: string
  category: string
  frequency: string
  color: string
  icon: string
  scheduleDescription: string
  currentStreak: number
  completionRateLastMonth: number
  isArchived: boolean
}

interface HabitListProps {
  habits: HabitItem[]
  completedIds: Set<string>
  onToggle: (habitId: string) => void
  onDelete?: (habitId: string) => void
  onAddHabit?: () => void
  isLoading?: boolean
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="card flex items-center gap-4 p-4 animate-pulse">
      <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="h-3.5 w-2/3 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-2.5 w-1/3 rounded-full bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="h-5 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HabitList({
  habits,
  completedIds,
  onToggle,
  onDelete,
  onAddHabit,
  isLoading = false,
}: HabitListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading habits">
        {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
      </div>
    )
  }

  if (habits.length === 0) {
    return (
      <EmptyState
        icon="✨"
        title="No habits yet"
        description="Start with one small habit. Consistency beats perfection."
        action={
          onAddHabit && (
            <Button size="sm" onClick={onAddHabit}>
              <Plus size={14} />
              Create your first habit
            </Button>
          )
        }
      />
    )
  }

  return (
    <div
      className="space-y-3"
      role="list"
      aria-label="Habit list"
    >
      {habits.map((habit) => (
        <div key={habit.id} role="listitem">
          <HabitCard
            habit={habit}
            isCompleted={completedIds.has(habit.id)}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  )
}
