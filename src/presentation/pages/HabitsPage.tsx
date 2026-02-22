/**
 * PRESENTATION LAYER — Habits Page
 *
 * Placeholder page showing a seeded list of dummy habits.
 * Replace dummy data with real store/use-case calls in Phase 2.
 */

import { Plus }         from 'lucide-react'
import type { Habit }   from '@domain/entities/Habit'
import { useHabitStore } from '@application/stores/habitStore'
import { HabitCard }    from '@presentation/components/habits/HabitCard'
import { Button }       from '@presentation/components/ui/Button'

// ─── Seed data so the page isn't empty ───────────────────────
const SEED_HABITS: Habit[] = [
  {
    id: 'seed-1',
    name: 'Morning meditation',
    description: '10 minutes of focused breathing',
    category: 'mindfulness',
    frequency: 'daily',
    color: '#8b5cf6',
    icon: '🧘',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isArchived: false,
  },
  {
    id: 'seed-2',
    name: 'Read 30 pages',
    description: 'Non-fiction or classic literature',
    category: 'learning',
    frequency: 'daily',
    color: '#0ea5e9',
    icon: '📚',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isArchived: false,
  },
  {
    id: 'seed-3',
    name: 'Exercise',
    description: 'At least 30 min of movement',
    category: 'fitness',
    frequency: 'daily',
    color: '#f97316',
    icon: '🏃',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isArchived: false,
  },
  {
    id: 'seed-4',
    name: 'Drink 2L water',
    category: 'health',
    frequency: 'daily',
    color: '#22c55e',
    icon: '💧',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isArchived: false,
  },
]

export function HabitsPage() {
  const { entries, selectedDate, toggleEntry } = useHabitStore()

  // Use seed data until real data loads from store
  const habits = SEED_HABITS

  const isCompleted = (habitId: string) =>
    entries.some((e) => e.habitId === habitId && e.date === selectedDate)

  const completedCount = habits.filter((h) => isCompleted(h.id)).length

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {selectedDate}
          </p>
          <p className="mt-0.5 font-display text-2xl font-700 text-slate-900 dark:text-white">
            {completedCount}/{habits.length} completed
          </p>
        </div>
        <Button size="sm">
          <Plus size={15} />
          Add Habit
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-500"
          style={{
            width: habits.length
              ? `${(completedCount / habits.length) * 100}%`
              : '0%',
          }}
        />
      </div>

      {/* Habit list */}
      <div className="space-y-3">
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            isCompleted={isCompleted(habit.id)}
            onToggle={(id) => toggleEntry(id, selectedDate)}
          />
        ))}
      </div>

      {habits.length === 0 && (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-4xl">✨</span>
          <p className="font-medium text-slate-700 dark:text-slate-300">
            No habits yet
          </p>
          <p className="text-sm text-slate-400">
            Add your first habit to get started.
          </p>
        </div>
      )}
    </div>
  )
}
