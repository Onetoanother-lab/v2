/**
 * PRESENTATION LAYER — CategoryFilter
 *
 * Horizontally scrollable tab strip showing all active categories.
 * "All" tab always first. Each category shows:
 *   • Category emoji
 *   • Category name
 *   • Count of habits in that category
 *   • Color dot derived from CATEGORY_META
 *
 * Purely presentational — receives data + callbacks as props.
 * All filter state lives in filterStore, accessed via useFilterStore selectors.
 *
 * Render optimization:
 *   • memo'd — only re-renders when categories or activeCategory changes
 *   • Counts computed outside the component (in HabitsPage) and passed as prop
 *   • Each CategoryTab is its own memo'd sub-component
 */

import { memo } from 'react'
import { cn } from '@presentation/styles/cn'
import { CATEGORY_META } from '@domain/entities/Habit'
import type { HabitCategory } from '@domain/entities/Habit'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryCount {
  category: HabitCategory
  count:    number
}

interface CategoryFilterProps {
  categories:     CategoryCount[]
  totalCount:     number
  activeCategory: HabitCategory | null
  onChange:       (cat: HabitCategory | null) => void
  className?:     string
}

// ─── Tab subcomponent ─────────────────────────────────────────────────────────

interface TabProps {
  label:     string
  emoji?:    string
  count:     number
  color?:    string
  isActive:  boolean
  onClick:   () => void
}

const Tab = memo(function Tab({ label, emoji, count, color, isActive, onClick }: TabProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        'flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5',
        'text-sm font-medium whitespace-nowrap transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
        isActive
          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
      )}
    >
      {/* Color dot (category color) */}
      {color && !isActive && (
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      )}

      {emoji && <span className="text-sm leading-none" role="img" aria-hidden>{emoji}</span>}
      <span>{label}</span>

      {/* Count badge */}
      <span
        className={cn(
          'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none',
          isActive
            ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
        )}
      >
        {count}
      </span>
    </button>
  )
})

// ─── Component ────────────────────────────────────────────────────────────────

export const CategoryFilter = memo(function CategoryFilter({
  categories,
  totalCount,
  activeCategory,
  onChange,
  className,
}: CategoryFilterProps) {
  return (
    <nav
      role="tablist"
      aria-label="Filter by category"
      className={cn(
        'flex items-center gap-1.5 overflow-x-auto pb-1',
        // Hide scrollbar visually but keep it functional
        'scrollbar-hide',
        className,
      )}
    >
      {/* "All" tab */}
      <Tab
        label="All"
        count={totalCount}
        isActive={activeCategory === null}
        onClick={() => onChange(null)}
      />

      {/* Category tabs */}
      {categories.map(({ category, count }) => {
        const meta = CATEGORY_META[category]
        return (
          <Tab
            key={category}
            label={meta.label}
            emoji={meta.emoji}
            count={count}
            color={meta.defaultColor}
            isActive={activeCategory === category}
            onClick={() => onChange(activeCategory === category ? null : category)}
          />
        )
      })}
    </nav>
  )
})
