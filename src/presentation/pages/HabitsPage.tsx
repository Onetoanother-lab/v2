/**
 * PRESENTATION LAYER — HabitsPage (Phase 3)
 *
 * The full habits page integrating:
 *   • FilterBar (category tabs + tag filter + sort + group-by)
 *   • Flat HabitList OR GroupedHabitList depending on groupBy setting
 *   • CreateHabitModal and EditHabitModal
 *   • DeleteConfirmModal
 *   • PWAInstallBanner
 *
 * This component orchestrates ALL page state but contains ZERO business logic:
 *   • Filter state → filterStore
 *   • Data fetching → useHabits hook
 *   • UI state (modal open, pending delete, editing habit) → local useState
 *
 * Render optimization:
 *   • All action callbacks wrapped in useCallback (stable refs for memoized children)
 *   • groupedHabits computation inside useHabits hook (memoized)
 *   • Category count computation is derived inline from habits (O(n) once per render)
 *   • FilterBar gets unfiltered `allHabits` for counts (stored separately)
 */

import { useState, useCallback, useMemo }    from 'react'
import { Plus }                              from 'lucide-react'
import { useHabits }                         from '@presentation/hooks/useHabits'
import { useFilterStore }                    from '@application/stores/filterStore'
import { usePWA }                            from '@presentation/hooks/usePWA'
import { FilterBar }                         from '@presentation/components/filters/FilterBar'
import { HabitCard }                         from '@presentation/components/habits/HabitCard'
import { CategoryGroup }                     from '@presentation/components/habits/CategoryGroup'
import { CreateHabitModal, EditHabitModal }  from '@presentation/components/habits/HabitModals'
import { DeleteConfirmModal }                from '@presentation/components/habits/DeleteConfirmModal'
import { EmptyState }                        from '@presentation/components/ui/EmptyState'
import { PWAInstallBanner }                  from '@presentation/components/pwa/PWABanners'
import { useHabitStore }                     from '@application/stores/habitStore'
import type { HabitSnapshot }                from '@domain/entities/Habit'

export function HabitsPage() {
  // ── Data & actions ─────────────────────────────────────────────────────
  const {
    habits,           // filtered + sorted display list
    groupedHabits,    // Map<category | 'all', HabitSnapshot[]>
    completedIds,
    selectedDate,
    isLoading,
    error,
    totalCount,
    toggleCompletion,
    createHabit,
    updateHabit,
    deleteHabit,
  } = useHabits()

  // Unfiltered habits (for category count in FilterBar tabs)
  const allHabits = useHabitStore((s) => s.habits)

  // ── Filter store ───────────────────────────────────────────────────────
  const groupBy      = useFilterStore((s) => s.groupBy)
  const activeTags   = useFilterStore((s) => s.activeTags)
  const toggleTag    = useFilterStore((s) => s.toggleTag)

  // ── Local UI state ─────────────────────────────────────────────────────
  const [createOpen,     setCreateOpen]     = useState(false)
  const [editingHabit,   setEditingHabit]   = useState<HabitSnapshot | null>(null)
  const [pendingDelete,  setPendingDelete]  = useState<string | null>(null)

  // ── PWA ────────────────────────────────────────────────────────────────
  const { isInstallable, isOnline, install } = usePWA()

  // ── Stable callbacks (prevent unnecessary child re-renders) ────────────
  const handleToggle = useCallback((id: string) => toggleCompletion(id), [toggleCompletion])
  const handleEdit   = useCallback((h: HabitSnapshot) => setEditingHabit(h), [])
  const handleDelete = useCallback((id: string) => setPendingDelete(id), [])
  const handleTagClick = useCallback((tag: string) => toggleTag(tag), [toggleTag])

  const handleConfirmDelete = useCallback(async () => {
    if (pendingDelete) {
      await deleteHabit(pendingDelete)
      setPendingDelete(null)
    }
  }, [pendingDelete, deleteHabit])

  // Progress for the day
  const completedCount = completedIds.size
  const dueCount       = habits.filter((h) => h.isDueToday).length
  const progressPct    = dueCount > 0 ? completedCount / dueCount : 0

  // Format selected date
  const dateLabel = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00')
    const isToday = selectedDate === new Date().toISOString().split('T')[0]
    if (isToday) return 'Today'
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }, [selectedDate])

  return (
    <div className="mx-auto max-w-2xl space-y-5">

      {/* ── Install banner ────────────────────────────────────────────── */}
      {isInstallable && (
        <PWAInstallBanner isInstallable isOnline={isOnline} onInstall={install} />
      )}

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {dateLabel}
          </h2>
          {dueCount > 0 && (
            <p className="text-sm text-slate-400 mt-0.5">
              {completedCount} of {dueCount} habits done
            </p>
          )}
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          aria-label="Create new habit"
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm"
        >
          <Plus size={15} aria-hidden />
          New habit
        </button>
      </div>

      {/* ── Progress bar ──────────────────────────────────────────────── */}
      {dueCount > 0 && (
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={Math.round(progressPct * 100)}
          aria-valuemax={100}
          aria-label="Today's progress"
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progressPct * 100}%`,
              backgroundColor: progressPct === 1 ? '#22c55e' : progressPct >= 0.5 ? '#84cc16' : '#94a3b8',
            }}
          />
        </div>
      )}

      {/* ── Error banner ──────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Filter bar ────────────────────────────────────────────────── */}
      {(allHabits.length > 0 || totalCount > 0) && (
        <FilterBar habits={allHabits} />
      )}

      {/* ── Habit list ────────────────────────────────────────────────── */}
      {isLoading ? (
        // Skeleton
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <EmptyState
          icon="🌱"
          title={totalCount === 0 ? "No habits yet" : "No habits match your filters"}
          description={
            totalCount === 0
              ? "Create your first habit to start building your streak."
              : "Try adjusting your category or tag filters."
          }
          action={totalCount === 0 ? {
            label: "Create a habit",
            onClick: () => setCreateOpen(true),
          } : undefined}
        />
      ) : groupBy === 'category' ? (
        // Grouped view
        <div className="space-y-3" role="list" aria-label="Habits grouped by category">
          {[...groupedHabits.entries()].map(([category, categoryHabits]) => {
            if (category === 'all') return null
            return (
              <div key={category} role="listitem">
                <CategoryGroup
                  category={category as any}
                  habits={categoryHabits}
                  completedIds={completedIds}
                  activeTags={activeTags}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onTagClick={handleTagClick}
                />
              </div>
            )
          })}
        </div>
      ) : (
        // Flat list
        <div className="space-y-2" role="list" aria-label="Habits">
          {habits.map((habit) => (
            <div key={habit.id} role="listitem">
              <HabitCard
                habit={habit}
                isCompleted={completedIds.has(habit.id)}
                activeTags={activeTags}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onTagClick={handleTagClick}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────── */}
      <CreateHabitModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={createHabit}
      />

      <EditHabitModal
        habit={editingHabit}
        isOpen={editingHabit !== null}
        onClose={() => setEditingHabit(null)}
        onSubmit={updateHabit}
      />

      <DeleteConfirmModal
        isOpen={pendingDelete !== null}
        habitName={allHabits.find((h) => h.id === pendingDelete)?.name ?? ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

    </div>
  )
}
