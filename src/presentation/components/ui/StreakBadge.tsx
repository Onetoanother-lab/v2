/**
 * PRESENTATION LAYER — StreakBadge
 *
 * Displays a habit's current streak with a flame icon.
 * Purely presentational — receives streak as a prop.
 */

import { Flame } from 'lucide-react'
import { cn } from '@presentation/styles/cn'

interface StreakBadgeProps {
  streak: number
  className?: string
}

export function StreakBadge({ streak, className }: StreakBadgeProps) {
  if (streak === 0) return null

  const isHot = streak >= 7
  const isFire = streak >= 30

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
        isFire
          ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
          : isHot
          ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
        className,
      )}
    >
      <Flame
        size={10}
        className={cn(
          isFire ? 'text-orange-500' : isHot ? 'text-amber-500' : 'text-slate-400',
        )}
      />
      {streak}
    </span>
  )
}
