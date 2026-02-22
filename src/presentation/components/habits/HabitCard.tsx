/**
 * PRESENTATION LAYER — HabitCard
 *
 * Placeholder card for a single habit in the list.
 * Real check-off logic wired in Phase 2.
 */

import { CheckCircle2, Circle } from 'lucide-react'
import type { Habit }           from '@domain/entities/Habit'
import { Badge }                from '@presentation/components/ui/Badge'
import { cn }                   from '@presentation/styles/cn'

interface HabitCardProps {
  habit:       Habit
  isCompleted: boolean
  onToggle:    (habitId: string) => void
}

const categoryColor: Record<string, string> = {
  health:       'bg-emerald-400',
  fitness:      'bg-orange-400',
  mindfulness:  'bg-violet-400',
  learning:     'bg-sky-400',
  productivity: 'bg-amber-400',
  social:       'bg-pink-400',
  finance:      'bg-teal-400',
  other:        'bg-slate-400',
}

export function HabitCard({ habit, isCompleted, onToggle }: HabitCardProps) {
  return (
    <div
      className={cn(
        'card flex items-center gap-4 p-4 transition-all duration-200 animate-slide-up',
        isCompleted && 'opacity-60',
      )}
    >
      {/* Color dot */}
      <div
        className={cn(
          'h-2.5 w-2.5 flex-shrink-0 rounded-full',
          categoryColor[habit.category] ?? 'bg-slate-400',
        )}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'truncate text-sm font-medium text-slate-800 dark:text-slate-100',
            isCompleted && 'line-through',
          )}
        >
          {habit.name}
        </p>
        {habit.description && (
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {habit.description}
          </p>
        )}
      </div>

      {/* Category badge */}
      <Badge label={habit.category} variant="default" />

      {/* Completion toggle */}
      <button
        onClick={() => onToggle(habit.id)}
        aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
        className="flex-shrink-0 text-slate-300 transition-colors hover:text-brand-500 dark:text-slate-600 dark:hover:text-brand-400"
      >
        {isCompleted ? (
          <CheckCircle2 size={22} className="text-brand-500" />
        ) : (
          <Circle size={22} />
        )}
      </button>
    </div>
  )
}
