/**
 * PRESENTATION LAYER — HabitCard (Phase 3)
 *
 * Visual changes from Phase 1/2:
 *   • Left color stripe (resolveHabitColor → category default or custom)
 *   • Category pill with emoji
 *   • Tag pills via TagList (click-to-filter supported)
 *   • Edit button (pencil icon) in hover-reveal action row
 *
 * Architecture:
 *   • Still wrapped in React.memo — re-renders ONLY when:
 *       - habit data changes (name, tags, color, etc.)
 *       - isCompleted changes
 *       - onTagClick reference changes (stable via useCallback in parent)
 *   • resolveHabitColor is a pure domain function — no business logic here
 *   • Category label/emoji come from CATEGORY_META (domain constant)
 *
 * Props that MUST be stable (wrap in useCallback in parent):
 *   onToggle, onDelete, onEdit, onTagClick
 */

import { memo }                from 'react'
import { Pencil, Trash2, Flame } from 'lucide-react'
import { cn }                  from '@presentation/styles/cn'
import { TagList }             from '@presentation/components/ui/TagBadge'
import { CATEGORY_META, resolveHabitColor } from '@domain/entities/Habit'
import type { HabitSnapshot }  from '@domain/entities/Habit'

// ─── Mini completion bar (30-day history) ────────────────────────────────────

function MiniBar({ rate }: { rate: number }) {
  return (
    <div
      className="h-1 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
      role="progressbar"
      aria-valuenow={Math.round(rate * 100)}
      aria-valuemax={100}
      aria-label="30-day completion rate"
    >
      <div
        className="h-full rounded-full bg-brand-400 transition-all duration-500"
        style={{ width: `${rate * 100}%` }}
      />
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface HabitCardProps {
  habit:       HabitSnapshot
  isCompleted: boolean
  activeTags?: string[]    // tags currently active in filter — for highlighting
  onToggle:    (id: string) => void
  onDelete:    (id: string) => void
  onEdit:      (habit: HabitSnapshot) => void
  onTagClick?: (tag: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export const HabitCard = memo(function HabitCard({
  habit,
  isCompleted,
  activeTags = [],
  onToggle,
  onDelete,
  onEdit,
  onTagClick,
}: HabitCardProps) {
  const color   = resolveHabitColor(habit)
  const catMeta = CATEGORY_META[habit.category]

  return (
    <article
      className={cn(
        'group relative flex items-stretch overflow-hidden rounded-2xl',
        'border bg-white transition-all duration-200 dark:bg-slate-800/50',
        isCompleted
          ? 'border-brand-200 bg-brand-50/30 dark:border-brand-800/50 dark:bg-brand-900/10'
          : 'border-slate-100 hover:border-slate-200 dark:border-slate-700/50 dark:hover:border-slate-600',
        'hover:shadow-sm',
      )}
    >
      {/* ── Color stripe (left edge) ────────────────────────────────── */}
      <div
        className="w-1 flex-shrink-0 rounded-l-2xl transition-opacity duration-300"
        style={{ backgroundColor: color }}
        aria-hidden
      />

      {/* ── Main content ────────────────────────────────────────────── */}
      <div className="flex flex-1 items-start gap-3 px-4 py-3.5">

        {/* Completion toggle */}
        <button
          onClick={() => onToggle(habit.id)}
          aria-label={isCompleted ? `Mark ${habit.name} incomplete` : `Complete ${habit.name}`}
          className={cn(
            'mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center',
            'rounded-full border-2 transition-all duration-200',
            isCompleted
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-slate-300 hover:border-brand-400 dark:border-slate-600',
          )}
        >
          {isCompleted && (
            <svg viewBox="0 0 12 12" className="h-3 w-3 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2,6 5,9 10,3" />
            </svg>
          )}
        </button>

        {/* Content block */}
        <div className="flex-1 min-w-0">
          {/* Top row: icon + name + category badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {habit.icon && (
              <span className="text-base leading-none" role="img" aria-hidden>{habit.icon}</span>
            )}

            <span
              className={cn(
                'text-sm font-semibold text-slate-900 dark:text-slate-100 transition-all duration-200',
                isCompleted && 'line-through text-slate-400 dark:text-slate-500',
              )}
            >
              {habit.name}
            </span>

            {/* Category badge */}
            <span
              className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: `${color}18`,   // 10% opacity
                color,
              }}
            >
              <span role="img" aria-hidden>{catMeta.emoji}</span>
              {catMeta.label}
            </span>
          </div>

          {/* Tag pills */}
          {habit.tags && habit.tags.length > 0 && (
            <TagList
              tags={habit.tags}
              maxVisible={4}
              onTagClick={onTagClick}
              activeTags={activeTags}
              className="mt-1.5"
            />
          )}

          {/* Bottom row: streak + completion rate */}
          <div className="mt-2 flex items-center gap-3">
            {habit.currentStreak > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-500">
                <Flame size={11} aria-hidden />
                {habit.currentStreak}d
              </span>
            )}
            <MiniBar rate={habit.completionRateLastMonth} />
            <span className="text-[11px] text-slate-400 tabular-nums">
              {Math.round(habit.completionRateLastMonth * 100)}%
            </span>
          </div>
        </div>

        {/* ── Hover-reveal actions ────────────────────────────────── */}
        <div
          className={cn(
            'flex flex-shrink-0 items-center gap-1',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
          )}
        >
          <button
            onClick={() => onEdit(habit)}
            aria-label={`Edit ${habit.name}`}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(habit.id)}
            aria-label={`Delete ${habit.name}`}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </article>
  )
})
