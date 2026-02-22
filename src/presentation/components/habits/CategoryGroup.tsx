/**
 * PRESENTATION LAYER — CategoryGroup
 *
 * Collapsible section that wraps a list of habits under a category header.
 * Used by GroupedHabitList when groupBy = 'category'.
 *
 * Header shows:
 *   • Category emoji + name
 *   • Completion count (N/M)
 *   • Progress arc (SVG)
 *   • Collapse chevron
 *
 * Collapse state is LOCAL — each group remembers its own expanded/collapsed
 * state independently. Not stored in filterStore (that would make it global).
 *
 * Render optimization:
 *   • memo'd — re-renders only when habits, completedIds, or category changes
 *   • SVG arc computed as derived value (no useEffect, no memo needed — O(1))
 *   • Children (HabitCards) are already memo'd and only render on own changes
 */

import { useState, memo, useCallback } from 'react'
import { ChevronDown }                 from 'lucide-react'
import { cn }                          from '@presentation/styles/cn'
import { HabitCard }                   from '@presentation/components/habits/HabitCard'
import { CATEGORY_META, resolveHabitColor } from '@domain/entities/Habit'
import type { HabitSnapshot, HabitCategory } from '@domain/entities/Habit'

// ─── SVG Progress arc ─────────────────────────────────────────────────────────

function ProgressArc({ rate, color }: { rate: number; color: string }) {
  const r   = 10
  const cx  = 14
  const cy  = 14
  const len = 2 * Math.PI * r
  const dash = rate * len

  return (
    <svg width={28} height={28} viewBox="0 0 28 28" aria-hidden className="rotate-[-90deg]">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={2.5} className="text-slate-200 dark:text-slate-700" />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${len}`}
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
    </svg>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CategoryGroupProps {
  category:    HabitCategory
  habits:      HabitSnapshot[]
  completedIds: Set<string>
  activeTags?:  string[]
  onToggle:    (id: string) => void
  onDelete:    (id: string) => void
  onEdit:      (habit: HabitSnapshot) => void
  onTagClick?: (tag: string) => void
  initiallyOpen?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CategoryGroup = memo(function CategoryGroup({
  category,
  habits,
  completedIds,
  activeTags = [],
  onToggle,
  onDelete,
  onEdit,
  onTagClick,
  initiallyOpen = true,
}: CategoryGroupProps) {
  const [open, setOpen] = useState(initiallyOpen)

  const meta          = CATEGORY_META[category]
  const completedCount = habits.filter((h) => completedIds.has(h.id)).length
  const completionRate = habits.length > 0 ? completedCount / habits.length : 0
  const color          = meta.defaultColor

  const handleToggle = useCallback(() => setOpen((o) => !o), [])

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-700/50 overflow-hidden">
      {/* ── Group header ──────────────────────────────────────────────── */}
      <button
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls={`category-group-${category}`}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3',
          'bg-slate-50/80 dark:bg-slate-800/30',
          'text-left transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/50',
        )}
      >
        {/* Progress arc */}
        <div className="relative flex-shrink-0">
          <ProgressArc rate={completionRate} color={color} />
          <span
            className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
            style={{ color }}
          >
            {completedCount}
          </span>
        </div>

        {/* Title */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
            style={{ backgroundColor: `${color}18`, color }}
          >
            <span role="img" aria-hidden>{meta.emoji}</span>
            {meta.label}
          </span>

          <span className="text-xs text-slate-400 tabular-nums">
            {completedCount}/{habits.length}
          </span>
        </div>

        {/* Chevron */}
        <ChevronDown
          size={14}
          className={cn(
            'flex-shrink-0 text-slate-400 transition-transform duration-200',
            !open && '-rotate-90',
          )}
          aria-hidden
        />
      </button>

      {/* ── Habit list ─────────────────────────────────────────────── */}
      {open && (
        <div
          id={`category-group-${category}`}
          role="list"
          aria-label={`${meta.label} habits`}
          className="divide-y divide-slate-50 dark:divide-slate-800/50"
        >
          {habits.map((habit) => (
            <div key={habit.id} role="listitem" className="px-3 py-1.5">
              <HabitCard
                habit={habit}
                isCompleted={completedIds.has(habit.id)}
                activeTags={activeTags}
                onToggle={onToggle}
                onDelete={onDelete}
                onEdit={onEdit}
                onTagClick={onTagClick}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
