/**
 * PRESENTATION LAYER — FilterBar
 *
 * Composite filter toolbar combining:
 *   • CategoryFilter (horizontal tab strip)
 *   • Expandable TagFilter panel
 *   • Sort selector
 *   • Group-by toggle
 *   • Active filter count badge + clear all button
 *
 * Reads from filterStore directly (not via props) because it's a
 * "control panel" component — it controls global view state.
 * Child display components (HabitCard, etc.) receive data as props.
 *
 * Render optimization:
 *   • Each sub-filter is memo'd and only re-renders on its own slice
 *   • The tag panel collapse state is local useState (not in store)
 *   • All store actions are stable callbacks (no new refs on render)
 */

import { useState, memo, useCallback } from 'react'
import { SlidersHorizontal, ChevronDown, LayoutGrid, List } from 'lucide-react'
import { cn }                          from '@presentation/styles/cn'
import { useFilterStore, useActiveFilterCount } from '@application/stores/filterStore'
import { CategoryFilter }              from '@presentation/components/filters/CategoryFilter'
import { TagFilter }                   from '@presentation/components/filters/TagFilter'
import type { HabitSnapshot }          from '@domain/entities/Habit'
import type { HabitCategory }          from '@domain/entities/Habit'
import { CATEGORY_META }               from '@domain/entities/Habit'

interface FilterBarProps {
  habits:     HabitSnapshot[]   // unfiltered full list for counting
  className?: string
}

const SORT_OPTIONS = [
  { value: 'created',    label: 'Date added' },
  { value: 'name',       label: 'Name A–Z' },
  { value: 'streak',     label: 'Streak' },
  { value: 'completion', label: 'Completion rate' },
] as const

export const FilterBar = memo(function FilterBar({ habits, className }: FilterBarProps) {
  const [tagPanelOpen, setTagPanelOpen] = useState(false)

  // Filter store — granular selectors to avoid unnecessary re-renders
  const activeCategory  = useFilterStore((s) => s.activeCategory)
  const activeTags      = useFilterStore((s) => s.activeTags)
  const tagMode         = useFilterStore((s) => s.tagMode)
  const groupBy         = useFilterStore((s) => s.groupBy)
  const sortBy          = useFilterStore((s) => s.sortBy)
  const showCompleted   = useFilterStore((s) => s.showCompleted)
  const availableTags   = useFilterStore((s) => s.availableTags)
  const setCategory     = useFilterStore((s) => s.setCategory)
  const toggleTag       = useFilterStore((s) => s.toggleTag)
  const setTagMode      = useFilterStore((s) => s.setTagMode)
  const clearFilters    = useFilterStore((s) => s.clearFilters)
  const setGroupBy      = useFilterStore((s) => s.setGroupBy)
  const setSortBy       = useFilterStore((s) => s.setSortBy)
  const setShowCompleted = useFilterStore((s) => s.setShowCompleted)

  const activeFilterCount = useActiveFilterCount()

  // Compute category counts from the unfiltered habits list
  const categoryCounts = habits.reduce<Record<string, number>>((acc, h) => {
    acc[h.category] = (acc[h.category] ?? 0) + 1
    return acc
  }, {})

  const categoryItems = Object.entries(categoryCounts)
    .map(([category, count]) => ({ category: category as HabitCategory, count }))
    .sort((a, b) => b.count - a.count)

  const clearTagFilters = useCallback(() => {
    activeTags.forEach(() => {})   // noop for dep tracking
    useFilterStore.getState().clearFilters()
    // Only clear tags, not category
    useFilterStore.setState({ activeTags: [], tagMode: 'any' })
  }, [])

  return (
    <div className={cn('space-y-3', className)}>

      {/* ── Row 1: Category tabs + action buttons ─────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <CategoryFilter
            categories={categoryItems}
            totalCount={habits.length}
            activeCategory={activeCategory}
            onChange={setCategory}
          />
        </div>

        {/* Tag panel toggle */}
        {availableTags.length > 0 && (
          <button
            onClick={() => setTagPanelOpen((p) => !p)}
            aria-expanded={tagPanelOpen}
            aria-label="Toggle tag filters"
            className={cn(
              'flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5',
              'text-xs font-medium transition-all duration-150',
              tagPanelOpen || activeTags.length > 0
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 border border-brand-200 dark:border-brand-800'
                : 'border border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400',
            )}
          >
            <SlidersHorizontal size={12} aria-hidden />
            Tags
            {activeTags.length > 0 && (
              <span className="rounded-full bg-brand-500 px-1.5 text-[10px] text-white font-bold">
                {activeTags.length}
              </span>
            )}
            <ChevronDown
              size={10}
              className={cn('transition-transform duration-200', tagPanelOpen && 'rotate-180')}
            />
          </button>
        )}
      </div>

      {/* ── Row 2: Tag panel (collapsible) ───────────────────────────── */}
      {tagPanelOpen && (
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/30">
          <TagFilter
            availableTags={availableTags}
            activeTags={activeTags}
            tagMode={tagMode}
            onToggleTag={toggleTag}
            onSetTagMode={setTagMode}
            onClear={clearTagFilters}
          />
        </div>
      )}

      {/* ── Row 3: Sort + view options + active filter summary ────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="Sort habits by"
            className={cn(
              'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5',
              'text-xs font-medium text-slate-600 outline-none cursor-pointer',
              'transition-colors hover:border-slate-300',
              'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
              'focus-visible:ring-2 focus-visible:ring-brand-400',
            )}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Group-by toggle */}
          <button
            onClick={() => setGroupBy(groupBy === 'category' ? 'none' : 'category')}
            aria-pressed={groupBy === 'category'}
            aria-label={groupBy === 'category' ? 'Disable category grouping' : 'Group by category'}
            title="Group by category"
            className={cn(
              'rounded-lg border p-1.5 transition-colors duration-150',
              groupBy === 'category'
                ? 'border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-700 dark:bg-brand-900/20 dark:text-brand-400'
                : 'border-slate-200 text-slate-400 hover:border-slate-300 dark:border-slate-700 dark:text-slate-500',
            )}
          >
            <LayoutGrid size={14} aria-hidden />
          </button>

          {/* Show/hide completed toggle */}
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            aria-pressed={showCompleted}
            aria-label={showCompleted ? 'Hide completed habits' : 'Show completed habits'}
            title={showCompleted ? 'Hide completed' : 'Show completed'}
            className={cn(
              'rounded-lg border p-1.5 transition-colors duration-150',
              !showCompleted
                ? 'border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-700 dark:bg-brand-900/20 dark:text-brand-400'
                : 'border-slate-200 text-slate-400 hover:border-slate-300 dark:border-slate-700 dark:text-slate-500',
            )}
          >
            <List size={14} aria-hidden />
          </button>
        </div>

        {/* Active filter summary + clear all */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            aria-label="Clear all filters"
            className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 transition-colors"
          >
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
              {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
            </span>
            Clear all
          </button>
        )}
      </div>

    </div>
  )
})
